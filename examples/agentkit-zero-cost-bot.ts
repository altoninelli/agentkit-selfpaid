/**
 * Example: Autonomous Zero-Cost Payment Agent with Coinbase AgentKit & SelfPaidPal
 *
 * Demonstrates how to register `selfPaidActionProvider()` inside Coinbase AgentKit
 * on Base Mainnet (Chain ID 8453) so your agent can send payments, tips, and bounties
 * while recouping 100% of the principal via Aave V3 / Morpho yield farming.
 */

import { AgentKit, ViemWalletProvider } from '@coinbase/agentkit';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { selfPaidActionProvider } from '@altoninelli/agentkit-action-provider-selfpaid';

async function main() {
  const privateKey = (process.env.AGENT_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80') as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  // 1. Initialize Viem Wallet Provider on Base Mainnet (or use CdpEvmWalletProvider)
  const client = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
  });

  const walletProvider = new ViemWalletProvider(client);

  // 2. Initialize Coinbase AgentKit with SelfPaidPal Action Provider
  const agentKit = await AgentKit.from({
    walletProvider,
    actionProviders: [
      selfPaidActionProvider()
    ]
  });

  // 3. Inspect registered SelfPaid tools available to your LLM (LangChain / Vercel AI SDK / MCP)
  const actions = agentKit.getActions();
  console.log(`Loaded ${actions.length} SelfPaidPal actions on Base Mainnet:`);
  for (const action of actions) {
    console.log(` - ${action.name}: ${action.description}`);
  }

  // 4. Execute live read-only actions: Check Yield Rates & Quote a 10 USDC Zero-Cost Payment
  const provider = selfPaidActionProvider();
  console.log('\n--- 1. Checking Live Base DeFi Yield Rates ---');
  console.log(await provider.checkYieldRates(walletProvider as any, {}));

  console.log('\n--- 2. Quoting a 10 USDC Zero-Cost Payment ---');
  console.log(
    await provider.quoteZeroCostPayment(walletProvider as any, {
      amount: 10,
      protocol: 'auto',
      collateralMultiplier: 3,
      bufferPercentage: 3
    })
  );
}

main().catch(console.error);
