/**
 * SelfPaidPal API Client for Coinbase AgentKit
 * Zero-dependency native HTTPS client for https://selfpaid.cryptofolio.it
 */

import * as https from 'https';
import { URL, URLSearchParams } from 'url';

const DEFAULT_API_BASE = process.env.SELFPAY_API_URL || 'https://selfpaid.cryptofolio.it';

export interface RequestOptions {
  method?: string;
  body?: any;
  timeout?: number;
  baseUrl?: string;
}

export function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, timeout = 10000 } = options;
  const baseUrl = options.baseUrl || DEFAULT_API_BASE;
  const fullUrl = new URL(path, baseUrl);

  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
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
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(data.error || `HTTP ${res.statusCode}: ${raw}`));
            } else {
              resolve(data);
            }
          } catch (e: any) {
            reject(new Error(`Failed to parse response: ${e.message} (Raw: ${raw.substring(0, 100)})`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeout}ms`));
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export async function getRates(): Promise<any> {
  return request('/api/v1/payment/rates');
}

export interface QuoteParams {
  amount: number;
  protocol?: string;
  collateralMultiplier?: number;
  bufferPercentage?: number;
}

export async function getQuote(params: QuoteParams): Promise<any> {
  const query = new URLSearchParams({
    amount: String(params.amount),
    protocol: params.protocol || 'auto',
    ...(params.collateralMultiplier ? { collateral: String(params.collateralMultiplier) } : {}),
    ...(params.bufferPercentage ? { buffer: String(params.bufferPercentage) } : {})
  });
  return request(`/api/v1/payment/quote?${query.toString()}`);
}

export interface PaymentParams {
  amount: number;
  recipient: string;
  sender: string;
  protocol?: string;
  collateralMultiplier?: number;
  bufferPercentage?: number;
}

export async function buildPayment(params: PaymentParams): Promise<any> {
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

export async function getTreasury(walletAddress: string): Promise<any> {
  return request(`/api/v1/payment/treasury?wallet=${encodeURIComponent(walletAddress)}`);
}

export interface WithdrawParams {
  protocol?: string;
  amount?: number | string;
  walletAddress: string;
}

export async function buildWithdrawal(params: WithdrawParams): Promise<any> {
  return request('/api/v1/payment/withdraw', {
    method: 'POST',
    body: {
      protocol: params.protocol || 'aave',
      amount: params.amount !== undefined ? params.amount : 'all',
      walletAddress: params.walletAddress
    }
  });
}
