/**
 * Zod Input Schemas for SelfPaidPal Coinbase AgentKit Actions
 */

import { z } from './agentkitCompat';

export const CheckYieldRatesSchema = z
  .object({})
  .describe('No parameters required to fetch live yield rates on Base');

export const QuoteZeroCostPaymentSchema = z.object({
  amount: z
    .number()
    .positive()
    .describe('USDC amount to pay to the recipient (e.g. 5.0, 25.0)'),
  protocol: z
    .enum(['auto', 'aave', 'morpho'])
    .optional()
    .default('auto')
    .describe('DeFi yield protocol: "auto" selects highest APY, or explicitly "aave" / "morpho"'),
  collateralMultiplier: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .default(3)
    .describe('Collateral multiplier (e.g. 3 for 3x compact, 5 for 5x, 10 for 10x). Defaults to 3'),
  bufferPercentage: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(3)
    .describe('Safety buffer percentage against APY fluctuation (defaults to 3%)')
});

export const PrepareZeroCostPaymentSchema = z.object({
  recipient: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid 40-character hexadecimal EVM address on Base (0x...)')
    .describe('Recipient wallet or contract address on Base'),
  amount: z
    .number()
    .positive()
    .describe('USDC amount to pay to the recipient'),
  protocol: z
    .enum(['auto', 'aave', 'morpho'])
    .optional()
    .default('auto')
    .describe('DeFi protocol: "auto", "aave", or "morpho"'),
  collateralMultiplier: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .default(3)
    .describe('Collateral multiplier (defaults to 3x)'),
  bufferPercentage: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(3)
    .describe('Buffer percentage (defaults to 3%)')
});

export const SendZeroCostPaymentSchema = z.object({
  recipient: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid 40-character hexadecimal EVM address on Base (0x...)')
    .describe('Recipient address on Base to receive the USDC payment'),
  amount: z
    .number()
    .positive()
    .describe('USDC amount to pay to the recipient'),
  protocol: z
    .enum(['auto', 'aave', 'morpho'])
    .optional()
    .default('auto')
    .describe('DeFi protocol: "auto", "aave", or "morpho"'),
  collateralMultiplier: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .default(3)
    .describe('Collateral multiplier (defaults to 3x)'),
  bufferPercentage: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(3)
    .describe('Buffer percentage (defaults to 3%)')
});

export const GetTreasuryStatusSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid EVM address')
    .optional()
    .describe('Wallet or treasury address to inspect. Defaults to the agent wallet address')
});

export const RedeemCollateralSchema = z.object({
  protocol: z
    .enum(['aave', 'morpho'])
    .describe('Protocol to redeem collateral from: "aave" or "morpho"'),
  amount: z
    .number()
    .positive()
    .optional()
    .describe('USDC amount of collateral to withdraw. If omitted, withdraws maximum available balance'),
  execute: z
    .boolean()
    .optional()
    .default(false)
    .describe('If true, executes the withdrawal transaction immediately on-chain. If false, returns prepared calldata')
});
