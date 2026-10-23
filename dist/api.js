"use strict";
/**
 * SelfPaidPal API Client for Coinbase AgentKit
 * Zero-dependency native HTTPS client for https://selfpaid.cryptofolio.it
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWithdrawal = exports.getTreasury = exports.buildPayment = exports.getQuote = exports.getRates = exports.request = void 0;
const https = __importStar(require("https"));
const url_1 = require("url");
const DEFAULT_API_BASE = process.env.SELFPAY_API_URL || 'https://selfpaid.cryptofolio.it';
function request(path, options = {}) {
    const { method = 'GET', body, timeout = 10000 } = options;
    const baseUrl = options.baseUrl || DEFAULT_API_BASE;
    const fullUrl = new url_1.URL(path, baseUrl);
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = https.request({
            hostname: fullUrl.hostname,
            port: fullUrl.port || 443,
            path: fullUrl.pathname + fullUrl.search,
            method,
            headers: {
                'User-Agent': 'Coinbase-AgentKit-SelfPaid/1.0.0',
                'Accept': 'application/json',
                ...(payload
                    ? {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    }
                    : {})
            },
            timeout
        }, res => {
            let raw = '';
            res.on('data', chunk => (raw += chunk));
            res.on('end', () => {
                try {
                    const data = JSON.parse(raw);
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(data.error || `HTTP ${res.statusCode}: ${raw}`));
                    }
                    else {
                        resolve(data);
                    }
                }
                catch (e) {
                    reject(new Error(`Failed to parse response: ${e.message} (Raw: ${raw.substring(0, 100)})`));
                }
            });
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timed out after ${timeout}ms`));
        });
        req.on('error', reject);
        if (payload)
            req.write(payload);
        req.end();
    });
}
exports.request = request;
async function getRates() {
    return request('/api/v1/payment/rates');
}
exports.getRates = getRates;
async function getQuote(params) {
    const query = new url_1.URLSearchParams({
        amount: String(params.amount),
        protocol: params.protocol || 'auto',
        ...(params.collateralMultiplier ? { collateral: String(params.collateralMultiplier) } : {}),
        ...(params.bufferPercentage ? { buffer: String(params.bufferPercentage) } : {})
    });
    return request(`/api/v1/payment/quote?${query.toString()}`);
}
exports.getQuote = getQuote;
async function buildPayment(params) {
    return request('/api/v1/payment/build', {
        method: 'POST',
        body: {
            amount: params.amount,
            recipient: params.recipient,
            sender: params.sender,
            protocol: params.protocol || 'auto',
            collateral: params.collateralMultiplier,
            buffer: params.bufferPercentage
        }
    });
}
exports.buildPayment = buildPayment;
async function getTreasury(walletAddress) {
    return request(`/api/v1/payment/treasury?wallet=${encodeURIComponent(walletAddress)}`);
}
exports.getTreasury = getTreasury;
async function buildWithdrawal(params) {
    return request('/api/v1/payment/withdraw', {
        method: 'POST',
        body: {
            protocol: params.protocol || 'aave',
            amount: params.amount !== undefined ? params.amount : 'all',
            walletAddress: params.walletAddress
        }
    });
}
exports.buildWithdrawal = buildWithdrawal;
//# sourceMappingURL=api.js.map