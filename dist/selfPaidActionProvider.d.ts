/**
 * SelfPaidPal Action Provider for Coinbase AgentKit
 * Enables AI agents to execute zero-net-cost payments, tips, and bounties on Base
 * with 100% capital recovery through automated DeFi yield farming (Aave V3 & Morpho).
 */
import { ActionProvider, EvmWalletProvider, Network } from './agentkitCompat';
import type { z } from 'zod';
import { CheckYieldRatesSchema, QuoteZeroCostPaymentSchema, PrepareZeroCostPaymentSchema, SendZeroCostPaymentSchema, GetTreasuryStatusSchema, RedeemCollateralSchema } from './schemas';
export declare class SelfPaidActionProvider extends ActionProvider<EvmWalletProvider> {
    constructor();
    /**
     * SelfPaidPal operates natively on Base (Chain ID 8453)
     */
    supportsNetwork: (network: Network) => boolean;
    /**
     * 1. Check live DeFi yield rates on Base (Aave V3 & Morpho)
     */
    checkYieldRates(_walletProvider: EvmWalletProvider, _args: z.infer<typeof CheckYieldRatesSchema>): Promise<string>;
    /**
     * 2. Quote a zero-cost payment (collateral, fees, and recovery ETA)
     */
    quoteZeroCostPayment(_walletProvider: EvmWalletProvider, args: z.infer<typeof QuoteZeroCostPaymentSchema>): Promise<string>;
    /**
     * 3. Prepare zero-cost payment batch without broadcasting (simulation & Safe Multisig export)
     */
    prepareZeroCostPayment(walletProvider: EvmWalletProvider, args: z.infer<typeof PrepareZeroCostPaymentSchema>): Promise<string>;
    /**
     * 4. Send zero-cost payment on-chain (Autonomous Agent Execution)
     */
    sendZeroCostPayment(walletProvider: EvmWalletProvider, args: z.infer<typeof SendZeroCostPaymentSchema>): Promise<string>;
    /**
     * 5. Get accumulated treasury and yield recovery progress
     */
    getTreasuryStatus(walletProvider: EvmWalletProvider, args: z.infer<typeof GetTreasuryStatusSchema>): Promise<string>;
    /**
     * 6. Redeem/Withdraw yield collateral back to liquid USDC
     */
    redeemCollateral(walletProvider: EvmWalletProvider, args: z.infer<typeof RedeemCollateralSchema>): Promise<string>;
}
/**
 * Factory function conforming to official Coinbase AgentKit conventions
 */
export declare const selfPaidActionProvider: () => SelfPaidActionProvider;
//# sourceMappingURL=selfPaidActionProvider.d.ts.map