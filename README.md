# @altoninelli/agentkit-action-provider-selfpaid

[![npm version](https://img.shields.io/npm/v/@altoninelli/agentkit-action-provider-selfpaid.svg?color=0052FF)](https://www.npmjs.com/package/@altoninelli/agentkit-action-provider-selfpaid)
[![Base Mainnet](https://img.shields.io/badge/Network-Base_Mainnet_(8453)-0052FF?logo=coinbase)](https://base.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

Official **Coinbase AgentKit** (`@coinbase/agentkit`) Action Provider for **[SelfPaidPal](https://selfpaid.cryptofolio.it)** — enabling autonomous AI agents on **Base Mainnet (Chain ID 8453)** to execute **zero-net-cost USDC payments, bounties, and tips** where **100% of the principal is automatically recouped** through DeFi yield farming on **Aave V3** and **Morpho**.

---

## ✨ Why SelfPaidPal for Coinbase AgentKit?

Traditional AI agent payments permanently deplete the agent's treasury. With **SelfPaidPal**, every outgoing payment is paired with an automated DeFi yield deposit (`aBasUSDC` or `maUSDC`) minted directly back to the agent's wallet:

- **100% Principal Reimbursement**: Accrued yield on Base automatically recoups the entire payout + maintenance fee over time.
- **Zero Lockup Guarantee**: Yield-bearing collateral remains 100% owned by your agent's wallet. Redeem back to liquid USDC anytime in a single transaction with zero penalties.
- **Intelligent Allowance Optimization**: Automatically checks on-chain ERC-20 allowance and skips redundant `approve` calls, saving gas and preventing RPC node race conditions.
- **DAO & Safe Multisig Ready**: Exports ready-to-import **Safe Transaction Builder JSON** batches for multi-sig treasuries.
- **Framework Agnostic**: Works out-of-the-box with `@coinbase/agentkit-langchain`, `@coinbase/agentkit-vercel-ai-sdk`, `CdpEvmWalletProvider`, `CdpSmartWalletProvider`, `ViemWalletProvider`, and `PrivyWalletProvider`.

---

## 📦 Installation

```bash
npm install @altoninelli/agentkit-action-provider-selfpaid @coinbase/agentkit zod
```

---

## 🚀 Quick Start

```typescript
import { AgentKit, CdpEvmWalletProvider } from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { selfPaidActionProvider } from "@altoninelli/agentkit-action-provider-selfpaid";

// 1. Configure your Base Mainnet Wallet Provider (CDP, Smart Wallet, Viem, or Privy)
const walletProvider = await CdpEvmWalletProvider.configureWithWallet({
  apiKeyId: process.env.CDP_API_KEY_ID,
  apiKeySecret: process.env.CDP_API_KEY_SECRET,
  walletSecret: process.env.CDP_WALLET_SECRET,
  networkId: "base-mainnet",
});

// 2. Register SelfPaidActionProvider with AgentKit
const agentKit = await AgentKit.from({
  walletProvider,
  actionProviders: [
    selfPaidActionProvider(),
  ],
});

// 3. Pass tools to LangChain, Vercel AI SDK, or OpenAI Agents
const tools = await getLangChainTools(agentKit);
```

---

## 🛠️ Exposed Agent Actions (6 Tools)

| Action Name | Description | Gas Cost |
| :--- | :--- | :--- |
| **`check_yield_rates`** | Fetches live USDC lending APYs on Base for **Aave V3** and **Morpho** and estimates 100% recovery durations across 3x, 5x, and 10x multipliers. | Free (Read-Only) |
| **`quote_zero_cost_payment`** | Calculates exact yield collateral deposit, protocol fee (0.5%, min 0.10 USDC), and days to 100% capital recovery for any USDC payout. | Free (Read-Only) |
| **`prepare_zero_cost_payment`** | Builds the 4-call atomic EVM transaction batch and exports a **Safe Transaction Builder JSON** payload without broadcasting. | Free (Read-Only) |
| **`send_zero_cost_payment`** | **Autonomous On-Chain Execution**: Transfers fee & recipient payout, verifies/approves allowance, and supplies collateral to Aave V3 or Morpho on Base. | Base Gas (~$0.002) |
| **`get_treasury_status`** | Inspects the agent wallet's liquid USDC, active yield collateral (`aBasUSDC` / `maUSDC`), and accrued interest on Base. | Free (Read-Only) |
| **`redeem_collateral`** | Withdraws yield-bearing collateral from Aave V3 or Morpho back to liquid USDC with **Zero Lockup** (`execute: true` to broadcast, `false` for calldata). | Base Gas / Free |

---

## 🔗 Ecosystem & Resources

- **Live dApp & Dashboard**: [https://selfpaid.cryptofolio.it](https://selfpaid.cryptofolio.it)
- **Live Community Bounty Faucet**: [https://selfpaid.cryptofolio.it/bounty](https://selfpaid.cryptofolio.it/bounty)
- **Official MCP Server**: [`selfpaid-mcp`](https://www.npmjs.com/package/selfpaid-mcp)
- **Official ElizaOS Plugin**: [`@altoninelli/plugin-selfpaid`](https://www.npmjs.com/package/@altoninelli/plugin-selfpaid)
- **X (Twitter)**: [@CryptofolioAI](https://x.com/CryptofolioAI)

---

## 📄 License

MIT © [Alessandro Toninelli](https://github.com/altoninelli)
