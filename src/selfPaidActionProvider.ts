/**
 * SelfPaidPal Action Provider for Coinbase AgentKit
 * Enables AI agents to execute zero-net-cost payments, tips, and bounties on Base
 * with 100% capital recovery through automated DeFi yield farming (Aave V3 & Morpho).
 */

import { ActionProvider, CreateAction, EvmWalletProvider, Network } from './agentkitCompat';
import type { z } from 'zod';
import * as api from './api';
import {
  CheckYieldRatesSchema,
  QuoteZeroCostPaymentSchema,
  PrepareZeroCostPaymentSchema,
  SendZeroCostPaymentSchema,
  GetTreasuryStatusSchema,
  RedeemCollateralSchema
} from './schemas';

export class SelfPaidActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super('selfpaid', []);
  }

  /**
   * SelfPaidPal operates natively on Base (Chain ID 8453)
   */
  supportsNetwork = (network: Network): boolean => {
    return network.protocolFamily === 'evm';
  };

  /**
   * 1. Check live DeFi yield rates on Base (Aave V3 & Morpho)
   */
  @CreateAction({
    name: 'check_yield_rates',
    description:
      'Fetch current live USDC lending APYs on Base Mainnet for Aave V3 and Morpho Vaults. Helps the agent calculate recovery duration before transacting.',
    schema: CheckYieldRatesSchema
  })
  async checkYieldRates(_walletProvider: EvmWalletProvider, _args: z.infer<typeof CheckYieldRatesSchema>): Promise<string> {
    try {
      const data = await api.getRates();
      const aaveAPY = (data.rates?.aave?.supplyAPY * 100).toFixed(2);
      const morphoAPY = (data.rates?.morpho?.netApy * 100).toFixed(2);
      const best = (data.bestProtocol || 'aave').toUpperCase();

      return (
        `📈 **Live DeFi Yield Rates on Base Mainnet**:\n` +
        `• **Aave V3 USDC**: **${aaveAPY}% APY**\n` +
        `• **Morpho USDC Vault**: **${morphoAPY}% APY**\n` +
        `• **Recommended Protocol**: **${best}** (Highest yield efficiency)\n\n` +
        `⚡ **Estimated 100% Capital Recovery Speeds**:\n` +
        `• 3x Collateral: ~${data.recoveryEstimateDays?.['3x'] || 230} days\n` +
        `• 5x Collateral: ~${data.recoveryEstimateDays?.['5x'] || 138} days\n` +
        `• 10x Collateral: ~${data.recoveryEstimateDays?.['10x'] || 69} days\n\n` +
        `🛡️ *Yield tokens (aBasUSDC/maUSDC) remain in your wallet with Zero Lockup: withdraw anytime.*`
      );
    } catch (err: any) {
      return `❌ Failed to fetch live yield rates: ${err.message}`;
    }
  }

  /**
   * 2. Quote a zero-cost payment (collateral, fees, and recovery ETA)
   */
  @CreateAction({
    name: 'quote_zero_cost_payment',
    description:
      'Calculate the required yield deposit, developer fee (0.5%, min 0.1 USDC), and estimated recovery duration for a zero-net-cost payment on Base.',
    schema: QuoteZeroCostPaymentSchema
  })
  async quoteZeroCostPayment(
    _walletProvider: EvmWalletProvider,
    args: z.infer<typeof QuoteZeroCostPaymentSchema>
  ): Promise<string> {
    try {
      const quote = await api.getQuote({
        amount: args.amount,
        protocol: args.protocol,
        collateralMultiplier: args.collateralMultiplier,
        bufferPercentage: args.bufferPercentage
      });

      return (
        `💰 **SelfPaid Zero-Cost Payment Quote**:\n` +
        `• **Recipient Payout**: **${quote.amountToPay} USDC**\n` +
        `• **Maintenance Fee (0.5%)**: **${quote.feeAmount} USDC** (to protocol dev wallet)\n` +
        `• **Yield Collateral**: **${quote.yieldDepositAmount} USDC** (deposited into **${quote.selectedProtocol.toUpperCase()}**)\n` +
        `• **Total Required Upfront**: **${quote.totalRequiredAmount} USDC**\n` +
        `• **Effective APY**: ${(quote.estimatedAPY * 100).toFixed(2)}%\n` +
        `• **Reimbursement ETA**: **100% of payout recouped in ~${quote.estimatedRecoveryDays} days**\n\n` +
        `🛡️ **Zero Lockup Guarantee**: Collateral tokens are minted directly to your address and can be redeemed with 1 single transaction anytime.`
      );
    } catch (err: any) {
      return `❌ Failed to generate zero-cost payment quote: ${err.message}`;
    }
  }

  /**
   * 3. Prepare zero-cost payment batch without broadcasting (simulation & Safe Multisig export)
   */
  @CreateAction({
    name: 'prepare_zero_cost_payment',
    description:
      'Prepare a 4-call atomic zero-cost payment batch on Base without executing. Returns transaction calldata, breakdown, and Safe Transaction Builder JSON for DAOs.',
    schema: PrepareZeroCostPaymentSchema
  })
  async prepareZeroCostPayment(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof PrepareZeroCostPaymentSchema>
  ): Promise<string> {
    try {
      let sender = '0x0000000000000000000000000000000000000000';
      try {
        sender = await walletProvider.getAddress();
      } catch (_e) {
        // Fallback for simulation mode
      }

      const payment = await api.buildPayment({
        amount: args.amount,
        recipient: args.recipient,
        sender,
        protocol: args.protocol,
        collateralMultiplier: args.collateralMultiplier,
        bufferPercentage: args.bufferPercentage
      });

      const safeBatch = {
        version: '1.0',
        chainId: '8453',
        createdAt: Date.now(),
        meta: {
          name: `SelfPaid Zero-Cost Payment (${args.amount} USDC)`,
          description: `SelfPaidPal 4-call atomic batch on Base to ${args.recipient}`
        },
        transactions: payment.transactions.map((t: any) => ({
          to: t.to,
          value: t.value || '0',
          data: t.data,
          contractMethod: null,
          contractInputsValues: null
        }))
      };

      return (
        `📋 **Prepared Zero-Cost Payment Batch (Base Chain ID 8453)**:\n` +
        `• **Recipient**: \`${args.recipient}\` receives **${args.amount} USDC**\n` +
        `• **Sender**: \`${sender}\`\n` +
        `• **Developer Fee**: ${payment.summary.feeAmount} USDC\n` +
        `• **Yield Collateral**: ${payment.summary.yieldDepositAmount} USDC to ${payment.summary.protocol.toUpperCase()}\n` +
        `• **Total Capital**: ${payment.summary.totalRequiredAmount} USDC (100% recouped in ~${payment.summary.estimatedRecoveryDays} days)\n\n` +
        `**Sequential EVM Transactions (4 calls)**:\n` +
        payment.transactions
          .map((t: any) => `  ${t.step}. **${t.name}**: \`${t.to}\` — *${t.description}*`)
          .join('\n') +
        `\n\n**Safe Multisig JSON Payload**:\n\`\`\`json\n${JSON.stringify(safeBatch, null, 2)}\n\`\`\``
      );
    } catch (err: any) {
      return `❌ Failed to prepare zero-cost payment: ${err.message}`;
    }
  }

  /**
   * 4. Send zero-cost payment on-chain (Autonomous Agent Execution)
   */
  @CreateAction({
    name: 'send_zero_cost_payment',
    description:
      'Execute a zero-net-cost USDC payment directly on Base Mainnet. Automatically pays the recipient, developer fee, and deposits yield collateral into Aave/Morpho so the agent recovers 100% of the funds.',
    schema: SendZeroCostPaymentSchema
  })
  async sendZeroCostPayment(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SendZeroCostPaymentSchema>
  ): Promise<string> {
    try {
      const sender = await walletProvider.getAddress();
      const network = walletProvider.getNetwork();

      if (network.chainId && network.chainId !== '8453' && Number(network.chainId) !== 8453) {
        return `⚠️ SelfPaidPal requires Base Mainnet (Chain ID 8453). Active network: ${network.networkId || network.chainId}`;
      }

      // Build atomic transactions
      const payment = await api.buildPayment({
        amount: args.amount,
        recipient: args.recipient,
        sender,
        protocol: args.protocol,
        collateralMultiplier: args.collateralMultiplier,
        bufferPercentage: args.bufferPercentage
      });

      // Filter transactions with intelligent allowance check if applicable
      let txsToExecute = [...payment.transactions];
      const approveTx = txsToExecute.find(t => t.name === 'APPROVE_POOL');
      const supplyTx = txsToExecute.find(t => t.name === 'SUPPLY_YIELD');

      if (approveTx && supplyTx) {
        try {
          const currentAllowance = await walletProvider.readContract({
            address: approveTx.to as `0x${string}`,
            abi: [
              {
                name: 'allowance',
                type: 'function',
                stateMutability: 'view',
                inputs: [
                  { name: 'owner', type: 'address' },
                  { name: 'spender', type: 'address' }
                ],
                outputs: [{ name: '', type: 'uint256' }]
              }
            ],
            functionName: 'allowance',
            args: [sender, supplyTx.to]
          });

          const requiredHex =
            approveTx.data && approveTx.data.length >= 138
              ? approveTx.data.slice(74, 138)
              : supplyTx.data.slice(74, 138);
          const requiredWei = BigInt('0x' + requiredHex);
          if (BigInt(currentAllowance || 0) >= requiredWei) {
            // Skip APPROVE_POOL to save gas and eliminate RPC race conditions
            txsToExecute = txsToExecute.filter(t => t.name !== 'APPROVE_POOL');
          } else {
            // Upgrade approval to MaxUint256 so subsequent agent payments never need another approve tx
            const maxUint256Hex = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
            const spenderHex = supplyTx.to.slice(2).toLowerCase().padStart(64, '0');
            approveTx.data = '0x095ea7b3' + spenderHex + maxUint256Hex;
          }
        } catch (_allowanceErr) {
          // If readContract fails, proceed with standard sequence
        }
      }

      const executedHashes: Array<{ step: number; name: string; hash: string }> = [];

      // Execute atomic transaction sequence
      for (const tx of txsToExecute) {
        const hash = await walletProvider.sendTransaction({
          to: tx.to as `0x${string}`,
          data: tx.data as `0x${string}`,
          value: BigInt(tx.value || 0)
        });

        const receipt = await walletProvider.waitForTransactionReceipt(hash);
        if (receipt && (receipt.status === 'reverted' || receipt.status === 0)) {
          throw new Error(`Transaction ${tx.name} reverted on-chain. Hash: ${hash}`);
        }

        executedHashes.push({
          step: tx.step,
          name: tx.name,
          hash
        });
      }

      const payTx = executedHashes.find(t => t.name === 'PAYMENT')?.hash;
      const supplyTxHash = executedHashes.find(t => t.name === 'SUPPLY_YIELD')?.hash;
      const feeTxHash = executedHashes.find(t => t.name === 'DEVELOPER_FEE')?.hash;

      return (
        `🚀 **Zero-Cost Payment Successfully Executed on Base!**\n\n` +
        `• **Recipient**: \`${args.recipient}\` received **${args.amount} USDC**\n` +
        `• **Maintenance Fee**: ${payment.summary.feeAmount} USDC\n` +
        `• **Yield Collateral**: ${payment.summary.yieldDepositAmount} USDC supplied to **${payment.summary.protocol.toUpperCase()}**\n` +
        `• **Principal Recovery**: **100% recouped in ~${payment.summary.estimatedRecoveryDays} days**\n\n` +
        `🔍 **BaseScan Verified Transactions**:\n` +
        `• Payment Tx: https://basescan.org/tx/${payTx}\n` +
        (feeTxHash ? `• Fee Tx: https://basescan.org/tx/${feeTxHash}\n` : '') +
        (supplyTxHash ? `• Yield Deposit Tx: https://basescan.org/tx/${supplyTxHash}\n` : '') +
        `\n🛡️ *Yield tokens have been minted directly to your agent wallet (${sender}). Zero Lockup: withdraw anytime.*`
      );
    } catch (err: any) {
      return `❌ On-chain execution failed: ${err.message}`;
    }
  }

  /**
   * 5. Get accumulated treasury and yield recovery progress
   */
  @CreateAction({
    name: 'get_treasury_status',
    description:
      'Check active yield-bearing collateral (aBasUSDC/maUSDC), accrued yield interest, and capital recovery percentage for an agent address on Base.',
    schema: GetTreasuryStatusSchema
  })
  async getTreasuryStatus(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetTreasuryStatusSchema>
  ): Promise<string> {
    try {
      const wallet: string = args.walletAddress || (await walletProvider.getAddress());

      const treasury = await api.getTreasury(wallet);

      return (
        `🏛️ **SelfPaid Treasury & Yield Status on Base**:\n` +
        `• **Wallet**: \`${wallet}\`\n` +
        `• **Liquid USDC**: ${treasury.balances?.liquidUsdc || '0.00'} USDC\n` +
        `• **Aave V3 Collateral (aBasUSDC)**: ${treasury.balances?.aaveYieldUsdc || '0.00'} USDC\n` +
        `• **Morpho Collateral (maUSDC)**: ${treasury.balances?.morphoYieldUsdc || '0.00'} USDC\n` +
        `• **Total Capital Earning Yield**: **${treasury.balances?.totalYieldUsdc || '0.00'} USDC**\n` +
        `• **Total Accrued Yield**: +${treasury.balances?.totalAccruedYieldUsdc || '0.00'} USDC\n\n` +
        `🛡️ *All collateral is 100% liquid with Zero Lockup: redeem anytime using redeem_collateral.*`
      );
    } catch (err: any) {
      return `❌ Failed to fetch treasury status: ${err.message}`;
    }
  }

  /**
   * 6. Redeem/Withdraw yield collateral back to liquid USDC
   */
  @CreateAction({
    name: 'redeem_collateral',
    description:
      'Withdraw/redeem yield-bearing collateral (aBasUSDC or maUSDC) back to liquid USDC with zero lockup penalty.',
    schema: RedeemCollateralSchema
  })
  async redeemCollateral(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RedeemCollateralSchema>
  ): Promise<string> {
    try {
      const wallet = await walletProvider.getAddress();
      const withdrawal = await api.buildWithdrawal({
        protocol: args.protocol,
        amount: args.amount,
        walletAddress: wallet
      });

      if (args.execute) {
        const hash = await walletProvider.sendTransaction({
          to: withdrawal.transaction.to as `0x${string}`,
          data: withdrawal.transaction.data as `0x${string}`,
          value: BigInt(withdrawal.transaction.value || 0)
        });

        const receipt = await walletProvider.waitForTransactionReceipt(hash);
        if (receipt && (receipt.status === 'reverted' || receipt.status === 0)) {
          throw new Error(`Collateral withdrawal reverted on-chain. Hash: ${hash}`);
        }

        return (
          `✅ **Collateral Successfully Redeemed from ${args.protocol.toUpperCase()}!**\n\n` +
          `• **Amount Redeemed**: ${args.amount ? args.amount + ' USDC' : 'All available balance'}\n` +
          `• **Beneficiary**: \`${wallet}\`\n` +
          `• **Transaction Hash**: https://basescan.org/tx/${hash}\n\n` +
          `Liquid USDC is now available in your agent wallet.`
        );
      }

      return (
        `📋 **Prepared Collateral Withdrawal (${args.protocol.toUpperCase()})**:\n` +
        `• **Protocol**: ${args.protocol.toUpperCase()}\n` +
        `• **Amount**: ${args.amount ? args.amount + ' USDC' : 'All available collateral'}\n` +
        `• **Beneficiary**: \`${wallet}\`\n` +
        `• **Target Contract**: \`${withdrawal.transaction.to}\`\n` +
        `• **Calldata**: \`${withdrawal.transaction.data}\`\n\n` +
        `💡 *Set execute: true to automatically sign and broadcast this withdrawal on Base.*`
      );
    } catch (err: any) {
      return `❌ Failed to redeem collateral: ${err.message}`;
    }
  }
}

/**
 * Factory function conforming to official Coinbase AgentKit conventions
 */
export const selfPaidActionProvider = () => new SelfPaidActionProvider();
