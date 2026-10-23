"use strict";
/**
 * Zod Input Schemas for SelfPaidPal Coinbase AgentKit Actions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedeemCollateralSchema = exports.GetTreasuryStatusSchema = exports.SendZeroCostPaymentSchema = exports.PrepareZeroCostPaymentSchema = exports.QuoteZeroCostPaymentSchema = exports.CheckYieldRatesSchema = void 0;
const agentkitCompat_1 = require("./agentkitCompat");
exports.CheckYieldRatesSchema = agentkitCompat_1.z
    .object({})
    .describe('No parameters required to fetch live yield rates on Base');
exports.QuoteZeroCostPaymentSchema = agentkitCompat_1.z.object({
    amount: agentkitCompat_1.z
        .number()
        .positive()
        .describe('USDC amount to pay to the recipient (e.g. 5.0, 25.0)'),
    protocol: agentkitCompat_1.z
        .enum(['auto', 'aave', 'morpho'])
        .optional()
        .default('auto')
        .describe('DeFi yield protocol: "auto" selects highest APY, or explicitly "aave" / "morpho"'),
    collateralMultiplier: agentkitCompat_1.z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(3)
        .describe('Collateral multiplier (e.g. 3 for 3x compact, 5 for 5x, 10 for 10x). Defaults to 3'),
    bufferPercentage: agentkitCompat_1.z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(3)
        .describe('Safety buffer percentage against APY fluctuation (defaults to 3%)')
});
exports.PrepareZeroCostPaymentSchema = agentkitCompat_1.z.object({
    recipient: agentkitCompat_1.z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid 40-character hexadecimal EVM address on Base (0x...)')
        .describe('Recipient wallet or contract address on Base'),
    amount: agentkitCompat_1.z
        .number()
        .positive()
        .describe('USDC amount to pay to the recipient'),
    protocol: agentkitCompat_1.z
        .enum(['auto', 'aave', 'morpho'])
        .optional()
        .default('auto')
        .describe('DeFi protocol: "auto", "aave", or "morpho"'),
    collateralMultiplier: agentkitCompat_1.z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(3)
        .describe('Collateral multiplier (defaults to 3x)'),
    bufferPercentage: agentkitCompat_1.z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(3)
        .describe('Buffer percentage (defaults to 3%)')
});
exports.SendZeroCostPaymentSchema = agentkitCompat_1.z.object({
    recipient: agentkitCompat_1.z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid 40-character hexadecimal EVM address on Base (0x...)')
        .describe('Recipient address on Base to receive the USDC payment'),
    amount: agentkitCompat_1.z
        .number()
        .positive()
        .describe('USDC amount to pay to the recipient'),
    protocol: agentkitCompat_1.z
        .enum(['auto', 'aave', 'morpho'])
        .optional()
        .default('auto')
        .describe('DeFi protocol: "auto", "aave", or "morpho"'),
    collateralMultiplier: agentkitCompat_1.z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(3)
        .describe('Collateral multiplier (defaults to 3x)'),
    bufferPercentage: agentkitCompat_1.z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(3)
        .describe('Buffer percentage (defaults to 3%)')
});
exports.GetTreasuryStatusSchema = agentkitCompat_1.z.object({
    walletAddress: agentkitCompat_1.z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid EVM address')
        .optional()
        .describe('Wallet or treasury address to inspect. Defaults to the agent wallet address')
});
exports.RedeemCollateralSchema = agentkitCompat_1.z.object({
    protocol: agentkitCompat_1.z
        .enum(['aave', 'morpho'])
        .describe('Protocol to redeem collateral from: "aave" or "morpho"'),
    amount: agentkitCompat_1.z
        .number()
        .positive()
        .optional()
        .describe('USDC amount of collateral to withdraw. If omitted, withdraws maximum available balance'),
    execute: agentkitCompat_1.z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, executes the withdrawal transaction immediately on-chain. If false, returns prepared calldata')
});
//# sourceMappingURL=schemas.js.map