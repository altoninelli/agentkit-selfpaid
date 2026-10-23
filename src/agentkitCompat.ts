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

export abstract class StandaloneWalletProvider {
  abstract getAddress(): string | Promise<string>;
  abstract getNetwork(): Network;
  abstract getName(): string;
}

export abstract class StandaloneEvmWalletProvider extends StandaloneWalletProvider {
  abstract sendTransaction(tx: { to: `0x${string}`; data?: `0x${string}`; value?: bigint }): Promise<`0x${string}`>;
  abstract waitForTransactionReceipt(txHash: `0x${string}`): Promise<any>;
  abstract readContract(params: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args?: any[];
  }): Promise<any>;
}

export const FALLBACK_DECORATOR_KEY = Symbol.for('agentkit:action');
const metadataStore = new WeakMap<any, Map<string, ActionMetadata>>();

export class StandaloneActionProvider<TWalletProvider = StandaloneEvmWalletProvider> {
  public name: string;
  public actionProviders: StandaloneActionProvider<TWalletProvider>[];

  constructor(name: string, actionProviders: StandaloneActionProvider<TWalletProvider>[] = []) {
    this.name = name;
    this.actionProviders = actionProviders;
  }

  getActions(walletProvider: TWalletProvider): Action[] {
    const actions: Action[] = [];
    const providers = [this, ...this.actionProviders];

    for (const provider of providers) {
      const map =
        (typeof Reflect !== 'undefined' &&
          typeof (Reflect as any).getMetadata === 'function' &&
          (Reflect as any).getMetadata(FALLBACK_DECORATOR_KEY, provider.constructor)) ||
        metadataStore.get(provider.constructor);

      if (!map) continue;

      for (const meta of map.values()) {
        actions.push({
          name: meta.name,
          description: meta.description,
          schema: meta.schema,
          invoke: async (schemaArgs: any) => {
            const parsed = meta.schema && typeof meta.schema.parse === 'function'
              ? meta.schema.parse(schemaArgs ?? {})
              : (schemaArgs ?? {});
            if (meta.walletProvider) {
              return meta.invoke.call(provider, walletProvider, parsed);
            }
            return meta.invoke.call(provider, parsed);
          }
        });
      }
    }

    return actions;
  }

  supportsNetwork(_network: Network): boolean {
    return true;
  }
}

export function standaloneCreateAction(params: {
  name: string;
  description: string;
  schema?: any;
}) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const prefixedName = `${target.constructor.name}_${params.name}`;
    const originalMethod = descriptor.value;

    const existingMap: Map<string, ActionMetadata> =
      metadataStore.get(target.constructor) || new Map<string, ActionMetadata>();

    existingMap.set(propertyKey, {
      name: prefixedName,
      description: params.description,
      schema: params.schema,
      invoke: originalMethod,
      walletProvider: true
    });

    metadataStore.set(target.constructor, existingMap);

    if (typeof Reflect !== 'undefined' && typeof (Reflect as any).defineMetadata === 'function') {
      (Reflect as any).defineMetadata(FALLBACK_DECORATOR_KEY, existingMap, target.constructor);
    }

    return descriptor;
  };
}

// Attempt to load official @coinbase/agentkit at runtime if available and supported by current Node engine
let resolvedActionProvider: typeof StandaloneActionProvider = StandaloneActionProvider;
let resolvedCreateAction: typeof standaloneCreateAction = standaloneCreateAction;
let resolvedEvmWalletProvider: typeof StandaloneEvmWalletProvider = StandaloneEvmWalletProvider;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const officialAgentKit = require('@coinbase/agentkit');
  if (officialAgentKit && officialAgentKit.ActionProvider && officialAgentKit.CreateAction) {
    resolvedActionProvider = officialAgentKit.ActionProvider;
    resolvedCreateAction = officialAgentKit.CreateAction;
    resolvedEvmWalletProvider = officialAgentKit.EvmWalletProvider || StandaloneEvmWalletProvider;
  }
} catch (_err) {
  // Using standalone compatible implementation
}

// Attempt to load official zod at runtime, with a zero-dependency Zod-compatible fallback
function createFallbackZod() {
  class FallbackSchema {
    private validators: Array<(val: any) => void> = [];
    private isOpt = false;
    private hasDef = false;
    private defVal: any = undefined;
    public description?: string;

    constructor(baseValidator?: (val: any) => void) {
      if (baseValidator) this.validators.push(baseValidator);
    }

    private clone(): FallbackSchema {
      const next = new FallbackSchema();
      next.validators = [...this.validators];
      next.isOpt = this.isOpt;
      next.hasDef = this.hasDef;
      next.defVal = this.defVal;
      next.description = this.description;
      return next;
    }

    describe(desc: string) {
      const next = this.clone();
      next.description = desc;
      return next;
    }

    optional() {
      const next = this.clone();
      next.isOpt = true;
      return next;
    }

    default(val: any) {
      const next = this.clone();
      next.isOpt = true;
      next.hasDef = true;
      next.defVal = val;
      return next;
    }

    positive() {
      const next = this.clone();
      next.validators.push((v: any) => {
        if (typeof v !== 'number' || v <= 0) throw new Error('Expected positive number');
      });
      return next;
    }

    min(minVal: number) {
      const next = this.clone();
      next.validators.push((v: any) => {
        if (typeof v === 'number' && v < minVal) throw new Error(`Minimum value is ${minVal}`);
      });
      return next;
    }

    max(maxVal: number) {
      const next = this.clone();
      next.validators.push((v: any) => {
        if (typeof v === 'number' && v > maxVal) throw new Error(`Maximum value is ${maxVal}`);
      });
      return next;
    }

    regex(pattern: RegExp, msg?: string) {
      const next = this.clone();
      next.validators.push((v: any) => {
        if (typeof v !== 'string' || !pattern.test(v)) throw new Error(msg || 'Invalid string format');
      });
      return next;
    }

    parse(input: any): any {
      if (input === undefined) {
        if (this.hasDef) return this.defVal;
        if (this.isOpt) return undefined;
        throw new Error('Value is required');
      }
      for (const fn of this.validators) fn(input);
      return input;
    }

    safeParse(input: any): { success: boolean; data?: any; error?: Error } {
      try {
        return { success: true, data: this.parse(input) };
      } catch (err: any) {
        return { success: false, error: err };
      }
    }
  }

  return {
    string: () =>
      new FallbackSchema((v: any) => {
        if (typeof v !== 'string') throw new Error('Expected string');
      }),
    number: () =>
      new FallbackSchema((v: any) => {
        if (typeof v !== 'number' || Number.isNaN(v)) throw new Error('Expected number');
      }),
    boolean: () =>
      new FallbackSchema((v: any) => {
        if (typeof v !== 'boolean') throw new Error('Expected boolean');
      }),
    enum: (values: readonly string[]) =>
      new FallbackSchema((v: any) => {
        if (!values.includes(v)) throw new Error(`Expected one of: ${values.join(', ')}`);
      }),
    object: (shape: Record<string, FallbackSchema>) => {
      const objSchema = new FallbackSchema((v: any) => {
        if (typeof v !== 'object' || v === null || Array.isArray(v)) {
          throw new Error('Expected object');
        }
      });
      const origParse = objSchema.parse.bind(objSchema);
      objSchema.parse = (input: any) => {
        const base = origParse(input ?? {});
        const out: Record<string, any> = {};
        for (const [key, fieldSchema] of Object.entries(shape)) {
          out[key] = fieldSchema.parse(base[key]);
        }
        return out;
      };
      return objSchema;
    }
  };
}

let resolvedZod: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  resolvedZod = require('zod').z;
} catch (_err) {
  resolvedZod = createFallbackZod();
}

export const z = resolvedZod;
export const ActionProvider = resolvedActionProvider;
export const CreateAction = resolvedCreateAction;
export const EvmWalletProvider = resolvedEvmWalletProvider;
export type EvmWalletProvider = StandaloneEvmWalletProvider;
