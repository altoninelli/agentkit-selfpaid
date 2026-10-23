"use strict";
/**
 * SelfPaidPal Action Provider for Coinbase AgentKit
 * Enables AI agents to execute zero-net-cost payments, tips, and bounties on Base
 * with 100% capital recovery through automated DeFi yield farming (Aave V3 & Morpho).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selfPaidActionProvider = exports.SelfPaidActionProvider = void 0;
const agentkitCompat_1 = require("./agentkitCompat");
const api = __importStar(require("./api"));
const schemas_1 = require("./schemas");
class SelfPaidActionProvider extends agentkitCompat_1.ActionProvider {
    constructor() {
        super('selfpaid', []);
    }
    /**
     * SelfPaidPal operates natively on Base (Chain ID 8453)
     */
    supportsNetwork = (network) => {
        return network.protocolFamily === 'evm';
    };
    /**
     * 1. Check live DeFi yield rates on Base (Aave V3 & Morpho)
     */
    async checkYieldRates(_walletProvider, _args) {
        try {
            const data = await api.getRates();
            const aaveAPY = (data.rates?.aave?.supplyAPY * 100).toFixed(2);
            const morphoAPY = (data.rates?.morpho?.netApy * 100).toFixed(2);
            const best = (data.bestProtocol || 'aave').toUpperCase();
            return (`📈 **Live DeFi Yield Rates on Base Mainnet**:\n` +
                `• **Aave V3 USDC**: **${aaveAPY}% APY**\n` +
                `• **Morpho USDC Vault**: **${morphoAPY}% APY**\n` +
                `• **Recommended Protocol**: **${best}** (Highest yield efficiency)\n\n` +
                `⚡ **Estimated 100% Capital Recovery Speeds**:\n` +
                `• 3x Collateral: ~${data.recoveryEstimateDays?.['3x'] || 230} days\n` +
                `• 5x Collateral: ~${data.recoveryEstimateDays?.['5x'] || 138} days\n` +
                `• 10x Collateral: ~${data.recoveryEstimateDays?.['10x'] || 69} days\n\n` +
                `🛡️ *Yield tokens (aBasUSDC/maUSDC) remain in your wallet with Zero Lockup: withdraw anytime.*`);
        }
        catch (err) {
            return `❌ Failed to fetch live yield rates: ${err.message}`;
        }
    }
    /**
     * 2. Quote a zero-cost payment (collateral, fees, and recovery ETA)
     */
    async quoteZeroCostPayment(_walletProvider, args) {
        try {
            const quote = await api.getQuote({
                amount: args.amount,
                protocol: args.protocol,
                collateralMultiplier: args.collateralMultiplier,
                bufferPercentage: args.bufferPercentage
            });
            return (`💰 **SelfPaid Zero-Cost Payment Quote**:\n` +
                `• **Recipient Payout**: **${quote.amountToPay} USDC**\n` +
                `• **Maintenance Fee (0.5%)**: **${quote.feeAmount} USDC** (to protocol dev wallet)\n` +
                `• **Yield Collateral**: **${quote.yieldDepositAmount} USDC** (deposited into **${quote.selectedProtocol.toUpperCase()}**)\n` +
                `• **Total Required Upfront**: **${quote.totalRequiredAmount} USDC**\n` +
                `• **Effective APY**: ${(quote.estimatedAPY * 100).toFixed(2)}%\n` +
                `• **Reimbursement ETA**: **100% of payout recouped in ~${quote.estimatedRecoveryDays} days**\n\n` +
                `🛡️ **Zero Lockup Guarantee**: Collateral tokens are minted directly to your address and can be redeemed with 1 single transaction anytime.`);
        }
        catch (err) {
            return `❌ Failed to generate zero-cost payment quote: ${err.message}`;
        }
    }
    /**
     * 3. Prepare zero-cost payment batch without broadcasting (simulation & Safe Multisig export)
     */
    async prepareZeroCostPayment(walletProvider, args) {
        try {
            let sender = '0x0000000000000000000000000000000000000000';
            try {
                sender = await walletProvider.getAddress();
            }
            catch (_e) {
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
                transactions: payment.transactions.map((t) => ({
                    to: t.to,
                    value: t.value || '0',
                    data: t.data,
                    contractMethod: null,
                    contractInputsValues: null
                }))
            };
            return (`📋 **Prepared Zero-Cost Payment Batch (Base Chain ID 8453)**:\n` +
                `• **Recipient**: \`${args.recipient}\` receives **${args.amount} USDC**\n` +
                `• **Sender**: \`${sender}\`\n` +
                `• **Developer Fee**: ${payment.summary.feeAmount} USDC\n` +
                `• **Yield Collateral**: ${payment.summary.yieldDepositAmount} USDC to ${payment.summary.protocol.toUpperCase()}\n` +
                `• **Total Capital**: ${payment.summary.totalRequiredAmount} USDC (100% recouped in ~${payment.summary.estimatedRecoveryDays} days)\n\n` +
                `**Sequential EVM Transactions (4 calls)**:\n` +
                payment.transactions
                    .map((t) => `  ${t.step}. **${t.name}**: \`${t.to}\` — *${t.description}*`)
                    .join('\n') +
                `\n\n**Safe Multisig JSON Payload**:\n\`\`\`json\n${JSON.stringify(safeBatch, null, 2)}\n\`\`\``);
        }
        catch (err) {
            return `❌ Failed to prepare zero-cost payment: ${err.message}`;
        }
    }
    /**
     * 4. Send zero-cost payment on-chain (Autonomous Agent Execution)
     */
    async sendZeroCostPayment(walletProvider, args) {
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
                        address: approveTx.to,
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
                    const requiredHex = approveTx.data && approveTx.data.length >= 138
                        ? approveTx.data.slice(74, 138)
                        : supplyTx.data.slice(74, 138);
                    const requiredWei = BigInt('0x' + requiredHex);
                    if (BigInt(currentAllowance || 0) >= requiredWei) {
                        // Skip APPROVE_POOL to save gas and eliminate RPC race conditions
                        txsToExecute = txsToExecute.filter(t => t.name !== 'APPROVE_POOL');
                    }
                    else {
                        // Upgrade approval to MaxUint256 so subsequent agent payments never need another approve tx
                        const maxUint256Hex = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
                        const spenderHex = supplyTx.to.slice(2).toLowerCase().padStart(64, '0');
                        approveTx.data = '0x095ea7b3' + spenderHex + maxUint256Hex;
                    }
                }
                catch (_allowanceErr) {
                    // If readContract fails, proceed with standard sequence
                }
            }
            const executedHashes = [];
            // Execute atomic transaction sequence
            for (const tx of txsToExecute) {
                const hash = await walletProvider.sendTransaction({
                    to: tx.to,
                    data: tx.data,
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
            return (`🚀 **Zero-Cost Payment Successfully Executed on Base!**\n\n` +
                `• **Recipient**: \`${args.recipient}\` received **${args.amount} USDC**\n` +
                `• **Maintenance Fee**: ${payment.summary.feeAmount} USDC\n` +
                `• **Yield Collateral**: ${payment.summary.yieldDepositAmount} USDC supplied to **${payment.summary.protocol.toUpperCase()}**\n` +
                `• **Principal Recovery**: **100% recouped in ~${payment.summary.estimatedRecoveryDays} days**\n\n` +
                `🔍 **BaseScan Verified Transactions**:\n` +
                `• Payment Tx: https://basescan.org/tx/${payTx}\n` +
                (feeTxHash ? `• Fee Tx: https://basescan.org/tx/${feeTxHash}\n` : '') +
                (supplyTxHash ? `• Yield Deposit Tx: https://basescan.org/tx/${supplyTxHash}\n` : '') +
                `\n🛡️ *Yield tokens have been minted directly to your agent wallet (${sender}). Zero Lockup: withdraw anytime.*`);
        }
        catch (err) {
            return `❌ On-chain execution failed: ${err.message}`;
        }
    }
    /**
     * 5. Get accumulated treasury and yield recovery progress
     */
    async getTreasuryStatus(walletProvider, args) {
        try {
            const wallet = args.walletAddress || (await walletProvider.getAddress());
            const treasury = await api.getTreasury(wallet);
            return (`🏛️ **SelfPaid Treasury & Yield Status on Base**:\n` +
                `• **Wallet**: \`${wallet}\`\n` +
                `• **Liquid USDC**: ${treasury.balances?.liquidUsdc || '0.00'} USDC\n` +
                `• **Aave V3 Collateral (aBasUSDC)**: ${treasury.balances?.aaveYieldUsdc || '0.00'} USDC\n` +
                `• **Morpho Collateral (maUSDC)**: ${treasury.balances?.morphoYieldUsdc || '0.00'} USDC\n` +
                `• **Total Capital Earning Yield**: **${treasury.balances?.totalYieldUsdc || '0.00'} USDC**\n` +
                `• **Total Accrued Yield**: +${treasury.balances?.totalAccruedYieldUsdc || '0.00'} USDC\n\n` +
                `🛡️ *All collateral is 100% liquid with Zero Lockup: redeem anytime using redeem_collateral.*`);
        }
        catch (err) {
            return `❌ Failed to fetch treasury status: ${err.message}`;
        }
    }
    /**
     * 6. Redeem/Withdraw yield collateral back to liquid USDC
     */
    async redeemCollateral(walletProvider, args) {
        try {
            const wallet = await walletProvider.getAddress();
            const withdrawal = await api.buildWithdrawal({
                protocol: args.protocol,
                amount: args.amount,
                walletAddress: wallet
            });
            if (args.execute) {
                const hash = await walletProvider.sendTransaction({
                    to: withdrawal.transaction.to,
                    data: withdrawal.transaction.data,
                    value: BigInt(withdrawal.transaction.value || 0)
                });
                const receipt = await walletProvider.waitForTransactionReceipt(hash);
                if (receipt && (receipt.status === 'reverted' || receipt.status === 0)) {
                    throw new Error(`Collateral withdrawal reverted on-chain. Hash: ${hash}`);
                }
                return (`✅ **Collateral Successfully Redeemed from ${args.protocol.toUpperCase()}!**\n\n` +
                    `• **Amount Redeemed**: ${args.amount ? args.amount + ' USDC' : 'All available balance'}\n` +
                    `• **Beneficiary**: \`${wallet}\`\n` +
                    `• **Transaction Hash**: https://basescan.org/tx/${hash}\n\n` +
                    `Liquid USDC is now available in your agent wallet.`);
            }
            return (`📋 **Prepared Collateral Withdrawal (${args.protocol.toUpperCase()})**:\n` +
                `• **Protocol**: ${args.protocol.toUpperCase()}\n` +
                `• **Amount**: ${args.amount ? args.amount + ' USDC' : 'All available collateral'}\n` +
                `• **Beneficiary**: \`${wallet}\`\n` +
                `• **Target Contract**: \`${withdrawal.transaction.to}\`\n` +
                `• **Calldata**: \`${withdrawal.transaction.data}\`\n\n` +
                `💡 *Set execute: true to automatically sign and broadcast this withdrawal on Base.*`);
        }
        catch (err) {
            return `❌ Failed to redeem collateral: ${err.message}`;
        }
    }
}
exports.SelfPaidActionProvider = SelfPaidActionProvider;
__decorate([
    (0, agentkitCompat_1.CreateAction)({
        name: 'check_yield_rates',
        description: 'Fetch current live USDC lending APYs on Base Mainnet for Aave V3 and Morpho Vaults. Helps the agent calculate recovery duration before transacting.',
        schema: schemas_1.CheckYieldRatesSchema
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [agentkitCompat_1.EvmWalletProvider, void 0]),
    __metadata("design:returntype", Promise)
], SelfPaidActionProvider.prototype, "checkYieldRates", null);
__decorate([
    (0, agentkitCompat_1.CreateAction)({
        name: 'quote_zero_cost_payment',
        description: 'Calculate the required yield deposit, developer fee (0.5%, min 0.1 USDC), and estimated recovery duration for a zero-net-cost payment on Base.',
        schema: schemas_1.QuoteZeroCostPaymentSchema
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [agentkitCompat_1.EvmWalletProvider, void 0]),
    __metadata("design:returntype", Promise)
], SelfPaidActionProvider.prototype, "quoteZeroCostPayment", null);
__decorate([
    (0, agentkitCompat_1.CreateAction)({
        name: 'prepare_zero_cost_payment',
        description: 'Prepare a 4-call atomic zero-cost payment batch on Base without executing. Returns transaction calldata, breakdown, and Safe Transaction Builder JSON for DAOs.',
        schema: schemas_1.PrepareZeroCostPaymentSchema
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [agentkitCompat_1.EvmWalletProvider, void 0]),
    __metadata("design:returntype", Promise)
], SelfPaidActionProvider.prototype, "prepareZeroCostPayment", null);
__decorate([
    (0, agentkitCompat_1.CreateAction)({
        name: 'send_zero_cost_payment',
        description: 'Execute a zero-net-cost USDC payment directly on Base Mainnet. Automatically pays the recipient, developer fee, and deposits yield collateral into Aave/Morpho so the agent recovers 100% of the funds.',
        schema: schemas_1.SendZeroCostPaymentSchema
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [agentkitCompat_1.EvmWalletProvider, void 0]),
    __metadata("design:returntype", Promise)
], SelfPaidActionProvider.prototype, "sendZeroCostPayment", null);
__decorate([
    (0, agentkitCompat_1.CreateAction)({
        name: 'get_treasury_status',
        description: 'Check active yield-bearing collateral (aBasUSDC/maUSDC), accrued yield interest, and capital recovery percentage for an agent address on Base.',
        schema: schemas_1.GetTreasuryStatusSchema
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [agentkitCompat_1.EvmWalletProvider, void 0]),
    __metadata("design:returntype", Promise)
], SelfPaidActionProvider.prototype, "getTreasuryStatus", null);
__decorate([
    (0, agentkitCompat_1.CreateAction)({
        name: 'redeem_collateral',
        description: 'Withdraw/redeem yield-bearing collateral (aBasUSDC or maUSDC) back to liquid USDC with zero lockup penalty.',
        schema: schemas_1.RedeemCollateralSchema
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [agentkitCompat_1.EvmWalletProvider, void 0]),
    __metadata("design:returntype", Promise)
], SelfPaidActionProvider.prototype, "redeemCollateral", null);
/**
 * Factory function conforming to official Coinbase AgentKit conventions
 */
const selfPaidActionProvider = () => new SelfPaidActionProvider();
exports.selfPaidActionProvider = selfPaidActionProvider;
//# sourceMappingURL=selfPaidActionProvider.js.map