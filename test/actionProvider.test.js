/**
 * Unit & Integration Test Suite for @altoninelli/agentkit-action-provider-selfpaid
 */

const {
  SelfPaidActionProvider,
  selfPaidActionProvider,
  schemas,
  api
} = require('../dist/index');

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failed++;
  }
}

class MockEvmWalletProvider {
  constructor(options = {}) {
    this.address = options.address || '0x20469527C24d17113920D1C312Bd489C967E6c8F';
    this.network = options.network || {
      protocolFamily: 'evm',
      networkId: 'base-mainnet',
      chainId: '8453'
    };
    this.allowance = options.allowance !== undefined ? options.allowance : 0n;
    this.receiptStatus = options.receiptStatus || 'success';
    this.sentTransactions = [];
  }

  async getAddress() {
    return this.address;
  }

  getNetwork() {
    return this.network;
  }

  getName() {
    return 'mock_evm_wallet_provider';
  }

  async readContract(params) {
    if (params.functionName === 'allowance') {
      return this.allowance;
    }
    return 0n;
  }

  async sendTransaction(tx) {
    this.sentTransactions.push(tx);
    const stepIdx = this.sentTransactions.length;
    return `0x${String(stepIdx).padStart(64, 'a')}`;
  }

  async waitForTransactionReceipt(txHash) {
    return {
      transactionHash: txHash,
      status: this.receiptStatus
    };
  }
}

(async () => {
  console.log('🧪 Testing @altoninelli/agentkit-action-provider-selfpaid...\n');

  // 1. Provider Instantiation & Network Compatibility
  console.log('1. Action Provider Instantiation & Network Support:');
  const provider = selfPaidActionProvider();
  assert('Factory returns SelfPaidActionProvider instance', provider instanceof SelfPaidActionProvider);
  assert('Provider name is "selfpaid"', provider.name === 'selfpaid');
  assert(
    'Supports Base Mainnet EVM network',
    provider.supportsNetwork({ protocolFamily: 'evm', networkId: 'base-mainnet', chainId: '8453' }) === true
  );
  assert(
    'Rejects non-EVM network (e.g. Solana svm)',
    provider.supportsNetwork({ protocolFamily: 'svm', networkId: 'solana-mainnet' }) === false
  );

  // 2. Action Registration & Discovery
  console.log('\n2. Action Metadata & Tool Discovery (getActions):');
  const mockWallet = new MockEvmWalletProvider();
  const actions = provider.getActions(mockWallet);
  assert('Registers all 6 core SelfPaid actions', actions.length === 6);

  const actionNames = actions.map(a => a.name);
  assert('Includes check_yield_rates action', actionNames.some(n => n.endsWith('check_yield_rates')));
  assert('Includes quote_zero_cost_payment action', actionNames.some(n => n.endsWith('quote_zero_cost_payment')));
  assert('Includes prepare_zero_cost_payment action', actionNames.some(n => n.endsWith('prepare_zero_cost_payment')));
  assert('Includes send_zero_cost_payment action', actionNames.some(n => n.endsWith('send_zero_cost_payment')));
  assert('Includes get_treasury_status action', actionNames.some(n => n.endsWith('get_treasury_status')));
  assert('Includes redeem_collateral action', actionNames.some(n => n.endsWith('redeem_collateral')));

  // 3. Zod Schema Validation
  console.log('\n3. Zod Input Schema Validation:');
  const validQuote = schemas.QuoteZeroCostPaymentSchema.safeParse({ amount: 10 });
  assert('Quote schema accepts valid positive amount and applies defaults', validQuote.success && validQuote.data.protocol === 'auto');

  const invalidQuote = schemas.QuoteZeroCostPaymentSchema.safeParse({ amount: -5 });
  assert('Quote schema rejects negative amount', !invalidQuote.success);

  const invalidRecipient = schemas.SendZeroCostPaymentSchema.safeParse({
    recipient: 'not-an-evm-address',
    amount: 5
  });
  assert('SendPayment schema rejects malformed EVM address', !invalidRecipient.success);

  const validRecipient = schemas.SendZeroCostPaymentSchema.safeParse({
    recipient: '0x785cF69cEd4E20A7e975A3391d51321b1528Fdfe',
    amount: 5,
    protocol: 'aave'
  });
  assert('SendPayment schema accepts valid Base address and protocol', validRecipient.success);

  // 4. Mock API Responses for Fast Deterministic Execution Tests
  const origGetRates = api.getRates;
  const origGetQuote = api.getQuote;
  const origBuildPayment = api.buildPayment;
  const origGetTreasury = api.getTreasury;
  const origBuildWithdrawal = api.buildWithdrawal;

  api.getRates = async () => ({
    bestProtocol: 'aave',
    rates: {
      aave: { supplyAPY: 0.0452 },
      morpho: { netApy: 0.0431 }
    },
    recoveryEstimateDays: { '3x': 220, '5x': 132, '10x': 66 }
  });

  api.getQuote = async ({ amount }) => ({
    amountToPay: String(amount),
    feeAmount: '0.1',
    yieldDepositAmount: String(amount * 3),
    totalRequiredAmount: String(amount * 4 + 0.1),
    selectedProtocol: 'aave',
    estimatedAPY: 0.0452,
    estimatedRecoveryDays: 220
  });

  api.buildPayment = async ({ amount, recipient, sender }) => ({
    summary: {
      amountToPay: String(amount),
      feeAmount: '0.1',
      yieldDepositAmount: '1.045',
      totalRequiredAmount: '1.645',
      protocol: 'aave',
      estimatedRecoveryDays: 220
    },
    transactions: [
      {
        step: 1,
        name: 'DEVELOPER_FEE',
        description: 'Transfer 0.1 USDC fee',
        to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        data: '0xa9059cbb0001',
        value: '0x0'
      },
      {
        step: 2,
        name: 'PAYMENT',
        description: `Pay ${amount} USDC to ${recipient}`,
        to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        data: '0xa9059cbb0002',
        value: '0x0'
      },
      {
        step: 3,
        name: 'APPROVE_POOL',
        description: 'Approve USDC to Aave V3 Pool',
        to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        data: '0x095ea7b30003',
        value: '0x0'
      },
      {
        step: 4,
        name: 'SUPPLY_YIELD',
        description: `Supply USDC to Aave on behalf of ${sender}`,
        to: '0xa238dd80c259a72e81d7e4664a9801593f98d1c5',
        // selector(10 chars) + asset(64 chars) + amount(64 chars = 0x0ff208 = 1045000 wei)
        data:
          '0x617ba037' +
          '000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913' +
          '00000000000000000000000000000000000000000000000000000000000ff208',
        value: '0x0'
      }
    ]
  });

  api.getTreasury = async () => ({
    balances: {
      liquidUsdc: '25.50',
      aaveYieldUsdc: '104.50',
      morphoYieldUsdc: '0.00',
      totalYieldUsdc: '104.50',
      totalAccruedYieldUsdc: '1.85'
    }
  });

  api.buildWithdrawal = async ({ protocol }) => ({
    protocol,
    transaction: {
      to: '0xa238dd80c259a72e81d7e4664a9801593f98d1c5',
      data: '0x69328dec0001',
      value: '0x0'
    }
  });

  // 5. Execute Actions
  console.log('\n4. Action Execution Tests:');

  const ratesOut = await provider.checkYieldRates(mockWallet, {});
  assert('checkYieldRates returns formatted Aave & Morpho APY report', ratesOut.includes('4.52% APY') && ratesOut.includes('4.31% APY'));

  const quoteOut = await provider.quoteZeroCostPayment(mockWallet, {
    amount: 0.5,
    protocol: 'auto',
    collateralMultiplier: 3,
    bufferPercentage: 3
  });
  assert('quoteZeroCostPayment includes payout and recovery days', quoteOut.includes('0.5 USDC') && quoteOut.includes('220 days'));

  const prepOut = await provider.prepareZeroCostPayment(mockWallet, {
    recipient: '0x1111111111111111111111111111111111111111',
    amount: 0.5,
    protocol: 'aave',
    collateralMultiplier: 3,
    bufferPercentage: 3
  });
  assert('prepareZeroCostPayment includes 4 calls and Safe Multisig JSON', prepOut.includes('DEVELOPER_FEE') && prepOut.includes('"chainId": "8453"'));

  // Test sendZeroCostPayment with 0 allowance (executes all 4 txs)
  const walletZeroAllowance = new MockEvmWalletProvider({ allowance: 0n });
  const sendOut4 = await provider.sendZeroCostPayment(walletZeroAllowance, {
    recipient: '0x1111111111111111111111111111111111111111',
    amount: 0.5,
    protocol: 'aave',
    collateralMultiplier: 3,
    bufferPercentage: 3
  });
  assert('sendZeroCostPayment executes 4 transactions when allowance is 0', walletZeroAllowance.sentTransactions.length === 4);
  assert('sendZeroCostPayment returns BaseScan verification links', sendOut4.includes('https://basescan.org/tx/'));

  // Test sendZeroCostPayment with high allowance (Intelligent Allowance skips APPROVE_POOL -> 3 txs!)
  const walletHighAllowance = new MockEvmWalletProvider({ allowance: 10000000000n });
  await provider.sendZeroCostPayment(walletHighAllowance, {
    recipient: '0x1111111111111111111111111111111111111111',
    amount: 0.5,
    protocol: 'aave',
    collateralMultiplier: 3,
    bufferPercentage: 3
  });
  assert(
    'sendZeroCostPayment Intelligent Allowance skips APPROVE_POOL when allowance >= required (3 txs)',
    walletHighAllowance.sentTransactions.length === 3
  );

  // Test sendZeroCostPayment network check
  const wrongNetWallet = new MockEvmWalletProvider({
    network: { protocolFamily: 'evm', networkId: 'ethereum-mainnet', chainId: '1' }
  });
  const wrongNetOut = await provider.sendZeroCostPayment(wrongNetWallet, {
    recipient: '0x1111111111111111111111111111111111111111',
    amount: 0.5
  });
  assert('sendZeroCostPayment blocks execution on non-Base chainId', wrongNetOut.includes('requires Base Mainnet'));

  // Test getTreasuryStatus
  const treasuryOut = await provider.getTreasuryStatus(mockWallet, {});
  assert('getTreasuryStatus reports liquid and yield balances', treasuryOut.includes('25.50 USDC') && treasuryOut.includes('104.50 USDC'));

  // Test redeemCollateral (prepare vs execute)
  const redeemPrepOut = await provider.redeemCollateral(mockWallet, {
    protocol: 'aave',
    execute: false
  });
  assert('redeemCollateral (execute: false) returns prepared calldata without sending tx', redeemPrepOut.includes('Prepared Collateral Withdrawal'));

  const redeemWallet = new MockEvmWalletProvider();
  const redeemExecOut = await provider.redeemCollateral(redeemWallet, {
    protocol: 'aave',
    amount: 10,
    execute: true
  });
  assert('redeemCollateral (execute: true) broadcasts withdrawal transaction', redeemWallet.sentTransactions.length === 1 && redeemExecOut.includes('Successfully Redeemed'));

  // Restore original API functions
  api.getRates = origGetRates;
  api.getQuote = origGetQuote;
  api.buildPayment = origBuildPayment;
  api.getTreasury = origGetTreasury;
  api.buildWithdrawal = origBuildWithdrawal;

  // 6. Live Production API Verification (https://selfpaid.cryptofolio.it)
  console.log('\n5. Live Production API Integration (https://selfpaid.cryptofolio.it):');
  try {
    const liveRatesOut = await provider.checkYieldRates(mockWallet, {});
    assert('Live checkYieldRates connects to production API and returns APY', liveRatesOut.includes('Live DeFi Yield Rates on Base Mainnet'));

    const liveQuoteOut = await provider.quoteZeroCostPayment(mockWallet, {
      amount: 10,
      protocol: 'auto',
      collateralMultiplier: 3,
      bufferPercentage: 3
    });
    assert('Live quoteZeroCostPayment calculates real Base Mainnet quote', liveQuoteOut.includes('10 USDC') && liveQuoteOut.includes('Zero Lockup Guarantee'));
  } catch (err) {
    console.warn(`  ⚠️ Skipping live production check (offline): ${err.message}`);
  }

  console.log('\n========================================');
  console.log(`AGENTKIT PROVIDER RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================');

  if (failed > 0) process.exit(1);
})();
