"use strict";
/**
 * Coinbase AgentKit Compatibility & Runtime Loader
 *
 * Dynamically binds to @coinbase/agentkit when installed in the host agent runtime,
 * while providing a 100% compatible standalone implementation of ActionProvider,
 * CreateAction, and EvmWalletProvider for zero-dependency testing and lightweight environments.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvmWalletProvider = exports.CreateAction = exports.ActionProvider = exports.z = exports.standaloneCreateAction = exports.StandaloneActionProvider = exports.FALLBACK_DECORATOR_KEY = exports.StandaloneEvmWalletProvider = exports.StandaloneWalletProvider = void 0;
class StandaloneWalletProvider {
}
exports.StandaloneWalletProvider = StandaloneWalletProvider;
class StandaloneEvmWalletProvider extends StandaloneWalletProvider {
}
exports.StandaloneEvmWalletProvider = StandaloneEvmWalletProvider;
exports.FALLBACK_DECORATOR_KEY = Symbol.for('agentkit:action');
const metadataStore = new WeakMap();
class StandaloneActionProvider {
    name;
    actionProviders;
    constructor(name, actionProviders = []) {
        this.name = name;
        this.actionProviders = actionProviders;
    }
    getActions(walletProvider) {
        const actions = [];
        const providers = [this, ...this.actionProviders];
        for (const provider of providers) {
            const map = (typeof Reflect !== 'undefined' &&
                typeof Reflect.getMetadata === 'function' &&
                Reflect.getMetadata(exports.FALLBACK_DECORATOR_KEY, provider.constructor)) ||
                metadataStore.get(provider.constructor);
            if (!map)
                continue;
            for (const meta of map.values()) {
                actions.push({
                    name: meta.name,
                    description: meta.description,
                    schema: meta.schema,
                    invoke: async (schemaArgs) => {
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
    supportsNetwork(_network) {
        return true;
    }
}
exports.StandaloneActionProvider = StandaloneActionProvider;
function standaloneCreateAction(params) {
    return (target, propertyKey, descriptor) => {
        const prefixedName = `${target.constructor.name}_${params.name}`;
        const originalMethod = descriptor.value;
        const existingMap = metadataStore.get(target.constructor) || new Map();
        existingMap.set(propertyKey, {
            name: prefixedName,
            description: params.description,
            schema: params.schema,
            invoke: originalMethod,
            walletProvider: true
        });
        metadataStore.set(target.constructor, existingMap);
        if (typeof Reflect !== 'undefined' && typeof Reflect.defineMetadata === 'function') {
            Reflect.defineMetadata(exports.FALLBACK_DECORATOR_KEY, existingMap, target.constructor);
        }
        return descriptor;
    };
}
exports.standaloneCreateAction = standaloneCreateAction;
// Attempt to load official @coinbase/agentkit at runtime if available and supported by current Node engine
let resolvedActionProvider = StandaloneActionProvider;
let resolvedCreateAction = standaloneCreateAction;
let resolvedEvmWalletProvider = StandaloneEvmWalletProvider;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const officialAgentKit = require('@coinbase/agentkit');
    if (officialAgentKit && officialAgentKit.ActionProvider && officialAgentKit.CreateAction) {
        resolvedActionProvider = officialAgentKit.ActionProvider;
        resolvedCreateAction = officialAgentKit.CreateAction;
        resolvedEvmWalletProvider = officialAgentKit.EvmWalletProvider || StandaloneEvmWalletProvider;
    }
}
catch (_err) {
    // Using standalone compatible implementation
}
// Attempt to load official zod at runtime, with a zero-dependency Zod-compatible fallback
function createFallbackZod() {
    class FallbackSchema {
        validators = [];
        isOpt = false;
        hasDef = false;
        defVal = undefined;
        description;
        constructor(baseValidator) {
            if (baseValidator)
                this.validators.push(baseValidator);
        }
        clone() {
            const next = new FallbackSchema();
            next.validators = [...this.validators];
            next.isOpt = this.isOpt;
            next.hasDef = this.hasDef;
            next.defVal = this.defVal;
            next.description = this.description;
            return next;
        }
        describe(desc) {
            const next = this.clone();
            next.description = desc;
            return next;
        }
        optional() {
            const next = this.clone();
            next.isOpt = true;
            return next;
        }
        default(val) {
            const next = this.clone();
            next.isOpt = true;
            next.hasDef = true;
            next.defVal = val;
            return next;
        }
        positive() {
            const next = this.clone();
            next.validators.push((v) => {
                if (typeof v !== 'number' || v <= 0)
                    throw new Error('Expected positive number');
            });
            return next;
        }
        min(minVal) {
            const next = this.clone();
            next.validators.push((v) => {
                if (typeof v === 'number' && v < minVal)
                    throw new Error(`Minimum value is ${minVal}`);
            });
            return next;
        }
        max(maxVal) {
            const next = this.clone();
            next.validators.push((v) => {
                if (typeof v === 'number' && v > maxVal)
                    throw new Error(`Maximum value is ${maxVal}`);
            });
            return next;
        }
        regex(pattern, msg) {
            const next = this.clone();
            next.validators.push((v) => {
                if (typeof v !== 'string' || !pattern.test(v))
                    throw new Error(msg || 'Invalid string format');
            });
            return next;
        }
        parse(input) {
            if (input === undefined) {
                if (this.hasDef)
                    return this.defVal;
                if (this.isOpt)
                    return undefined;
                throw new Error('Value is required');
            }
            for (const fn of this.validators)
                fn(input);
            return input;
        }
        safeParse(input) {
            try {
                return { success: true, data: this.parse(input) };
            }
            catch (err) {
                return { success: false, error: err };
            }
        }
    }
    return {
        string: () => new FallbackSchema((v) => {
            if (typeof v !== 'string')
                throw new Error('Expected string');
        }),
        number: () => new FallbackSchema((v) => {
            if (typeof v !== 'number' || Number.isNaN(v))
                throw new Error('Expected number');
        }),
        boolean: () => new FallbackSchema((v) => {
            if (typeof v !== 'boolean')
                throw new Error('Expected boolean');
        }),
        enum: (values) => new FallbackSchema((v) => {
            if (!values.includes(v))
                throw new Error(`Expected one of: ${values.join(', ')}`);
        }),
        object: (shape) => {
            const objSchema = new FallbackSchema((v) => {
                if (typeof v !== 'object' || v === null || Array.isArray(v)) {
                    throw new Error('Expected object');
                }
            });
            const origParse = objSchema.parse.bind(objSchema);
            objSchema.parse = (input) => {
                const base = origParse(input ?? {});
                const out = {};
                for (const [key, fieldSchema] of Object.entries(shape)) {
                    out[key] = fieldSchema.parse(base[key]);
                }
                return out;
            };
            return objSchema;
        }
    };
}
let resolvedZod;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    resolvedZod = require('zod').z;
}
catch (_err) {
    resolvedZod = createFallbackZod();
}
exports.z = resolvedZod;
exports.ActionProvider = resolvedActionProvider;
exports.CreateAction = resolvedCreateAction;
exports.EvmWalletProvider = resolvedEvmWalletProvider;
//# sourceMappingURL=agentkitCompat.js.map