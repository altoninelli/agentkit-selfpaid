/**
 * SelfPaidPal API Client for Coinbase AgentKit
 * Zero-dependency native HTTPS client for https://selfpaid.cryptofolio.it
 */
export interface RequestOptions {
    method?: string;
    body?: any;
    timeout?: number;
    baseUrl?: string;
}
export declare function request<T = any>(path: string, options?: RequestOptions): Promise<T>;
export declare function getRates(): Promise<any>;
export interface QuoteParams {
    amount: number;
    protocol?: string;
    collateralMultiplier?: number;
    bufferPercentage?: number;
}
export declare function getQuote(params: QuoteParams): Promise<any>;
export interface PaymentParams {
    amount: number;
    recipient: string;
    sender: string;
    protocol?: string;
    collateralMultiplier?: number;
    bufferPercentage?: number;
}
export declare function buildPayment(params: PaymentParams): Promise<any>;
export declare function getTreasury(walletAddress: string): Promise<any>;
export interface WithdrawParams {
    protocol?: string;
    amount?: number | string;
    walletAddress: string;
}
export declare function buildWithdrawal(params: WithdrawParams): Promise<any>;
//# sourceMappingURL=api.d.ts.map