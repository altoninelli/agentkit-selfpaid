/**
 * Coinbase AgentKit Compatibility & Runtime Loader
 *
 * Dynamically binds to @coinbase/agentkit when installed in the host agent runtime,
 * while providing a 100% compatible standalone implementation of ActionProvider,
 * CreateAction, and EvmWalletProvider for zero-dependency testing and lightweight environments.
 */
export interface Network {
    protocolFamily: string;
    networkId?: string;
    chainId?: string | number;
}
export interface ActionMetadata {
    name: string;
    description: string;
    schema: any;
    invoke: (...args: any[]) => Promise<string>;
    walletProvider: boolean;
}
export interface Action {
    name: string;
    description: string;
    schema: any;
    invoke: (args: any) => Promise<string>;
}
export declare abstract class StandaloneWalletProvider {
    abstract getAddress(): string | Promise<string>;
    abstract getNetwork(): Network;
    abstract getName(): string;
}
export declare abstract class StandaloneEvmWalletProvider extends StandaloneWalletProvider {
    abstract sendTransaction(tx: {
        to: `0x${string}`;
        data?: `0x${string}`;
        value?: bigint;
    }): Promise<`0x${string}`>;
    abstract waitForTransactionReceipt(txHash: `0x${string}`): Promise<any>;
    abstract readContract(params: {
        address: `0x${string}`;
        abi: any;
        functionName: string;
        args?: any[];
    }): Promise<any>;
}
export declare const FALLBACK_DECORATOR_KEY: unique symbol;
export declare class StandaloneActionProvider<TWalletProvider = StandaloneEvmWalletProvider> {
    name: string;
    actionProviders: StandaloneActionProvider<TWalletProvider>[];
    constructor(name: string, actionProviders?: StandaloneActionProvider<TWalletProvider>[]);
    getActions(walletProvider: TWalletProvider): Action[];
    supportsNetwork(_network: Network): boolean;
}
export declare function standaloneCreateAction(params: {
    name: string;
    description: string;
    schema?: any;
}): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare const z: any;
export declare const ActionProvider: typeof StandaloneActionProvider;
export declare const CreateAction: typeof standaloneCreateAction;
export declare const EvmWalletProvider: typeof StandaloneEvmWalletProvider;
export type EvmWalletProvider = StandaloneEvmWalletProvider;
//# sourceMappingURL=agentkitCompat.d.ts.map