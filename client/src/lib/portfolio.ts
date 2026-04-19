// Deterministic mocked Portfolio dataset.
// In production this would proxy CoinMarketCap's Portfolio + DEX-Screener / chain
// explorers via the backend (web-db-user upgrade). For the static demo we hash
// the address+chain and return realistic-looking holdings so the UI feels alive.

import { ChainCode } from "./constants";

export interface Holding {
  symbol: string;
  name: string;
  amount: number;
  price: number;          // USD
  value: number;          // USD
  change24h: number;      // %
  pct: number;            // % of portfolio (computed)
  logo: string;           // CDN logo URL
  color: string;          // brand colour for chart segment
}

export interface Portfolio {
  address: string;
  chain: ChainCode;
  totalValue: number;
  change24h: number;
  holdings: Holding[];
  asOf: string;           // human readable timestamp
}

// CoinMarketCap CDN icons (always reachable, public).
const CMC = (id: number) =>
  `https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`;

// Token universe per chain — pulled by hash to mimic real holdings.
const UNIVERSE: Record<ChainCode, Omit<Holding, "amount" | "value" | "pct">[]> = {
  ETH: [
    { symbol: "ETH", name: "Ethereum",      price: 3850.42, change24h: 2.4, logo: CMC(1027), color: "#627EEA" },
    { symbol: "USDC", name: "USD Coin",     price: 1.00,    change24h: 0.0, logo: CMC(3408), color: "#2775CA" },
    { symbol: "USDT", name: "Tether",       price: 1.00,    change24h: 0.1, logo: CMC(825),  color: "#26A17B" },
    { symbol: "WBTC", name: "Wrapped BTC",  price: 67890.0, change24h: 1.7, logo: CMC(3717), color: "#F09242" },
    { symbol: "LINK", name: "Chainlink",    price: 18.44,   change24h: 4.1, logo: CMC(1975), color: "#2A5ADA" },
    { symbol: "ARB",  name: "Arbitrum",     price: 1.18,    change24h: -2.3, logo: CMC(11841), color: "#28A0F0" },
    { symbol: "OP",   name: "Optimism",     price: 2.10,    change24h: 1.2, logo: CMC(11840), color: "#FF0420" },
    { symbol: "UNI",  name: "Uniswap",      price: 11.62,   change24h: -0.8, logo: CMC(7083), color: "#FF007A" },
    { symbol: "AAVE", name: "Aave",         price: 142.30,  change24h: 3.6, logo: CMC(7278), color: "#B6509E" },
  ],
  BTC: [
    { symbol: "BTC", name: "Bitcoin",       price: 67890.0, change24h: 1.7, logo: CMC(1),    color: "#F7931A" },
  ],
  SOL: [
    { symbol: "SOL", name: "Solana",        price: 178.42,  change24h: 5.3, logo: CMC(5426), color: "#9945FF" },
    { symbol: "USDC", name: "USD Coin",     price: 1.00,    change24h: 0.0, logo: CMC(3408), color: "#2775CA" },
    { symbol: "JUP", name: "Jupiter",       price: 1.04,    change24h: -1.4, logo: CMC(29210), color: "#1FCFF1" },
    { symbol: "JTO", name: "Jito",          price: 3.42,    change24h: 7.1, logo: CMC(28541), color: "#84E1BC" },
    { symbol: "PYTH", name: "Pyth Network", price: 0.42,    change24h: 2.8, logo: CMC(28177), color: "#7B61FF" },
    { symbol: "WIF", name: "dogwifhat",     price: 2.18,    change24h: 12.4, logo: CMC(28752), color: "#FFB347" },
  ],
  TRX: [
    { symbol: "TRX", name: "Tron",          price: 0.165,   change24h: 0.6, logo: CMC(1958), color: "#FF0013" },
    { symbol: "USDT", name: "Tether (TRC20)", price: 1.00,  change24h: 0.0, logo: CMC(825),  color: "#26A17B" },
    { symbol: "BTT", name: "BitTorrent",    price: 0.00000084, change24h: 1.0, logo: CMC(16086), color: "#FF8A00" },
  ],
  XRP: [
    { symbol: "XRP", name: "XRP",           price: 0.62,    change24h: 1.1, logo: CMC(52),   color: "#00AAE4" },
    { symbol: "RLUSD", name: "Ripple USD",  price: 1.00,    change24h: 0.0, logo: CMC(3408), color: "#2775CA" },
  ],
  SUI: [
    { symbol: "SUI", name: "Sui",           price: 1.85,    change24h: 4.2, logo: CMC(20947), color: "#4DA2FF" },
    { symbol: "USDC", name: "USD Coin",     price: 1.00,    change24h: 0.0, logo: CMC(3408), color: "#2775CA" },
    { symbol: "DEEP", name: "DeepBook",     price: 0.084,   change24h: 6.8, logo: CMC(31726), color: "#FFC93C" },
  ],
};

function hash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) ^ input.charCodeAt(i);
  return Math.abs(h);
}

export function generatePortfolio(address: string, chain: ChainCode): Portfolio {
  const seed = hash(address.toLowerCase() + chain);
  const pool = UNIVERSE[chain];
  // Pick 3..pool.length holdings deterministically
  const count = Math.min(pool.length, 3 + (seed % Math.max(1, pool.length - 2)));

  const picks: Holding[] = [];
  for (let i = 0; i < count; i++) {
    const tok = pool[(seed + i * 11) % pool.length];
    if (picks.find((p) => p.symbol === tok.symbol)) continue;
    // amount range varies by token "weight" so totals look believable
    const ladder = [10, 5, 2.5, 1, 0.6, 0.3, 0.1, 0.05, 0.02];
    const baseUnits = ladder[i] ?? 0.01;
    const amount =
      tok.symbol === "BTC" || tok.symbol === "WBTC"
        ? baseUnits * (1 + (seed % 7) / 4)
        : tok.price > 100
        ? baseUnits * (5 + (seed % 12))
        : tok.price > 1
        ? baseUnits * (60 + (seed % 600))
        : baseUnits * (5000 + (seed % 50000));
    const value = amount * tok.price;
    picks.push({ ...tok, amount, value, pct: 0 });
  }

  const total = picks.reduce((s, p) => s + p.value, 0);
  picks.forEach((p) => (p.pct = (p.value / total) * 100));
  picks.sort((a, b) => b.value - a.value);

  // Weighted 24h change
  const change24h =
    picks.reduce((s, p) => s + (p.change24h * p.value) / total, 0);

  return {
    address,
    chain,
    totalValue: total,
    change24h,
    holdings: picks,
    asOf: new Date().toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };
}

export function formatUSD(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (opts.compact && n >= 1_000) return "$" + (n / 1_000).toFixed(2) + "K";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n < 1 ? 4 : 2,
  });
}

export function formatAmount(n: number, sym: string): string {
  // Heuristic: stables show 2 dp, big-cap 4 dp, micro >0
  const dp = n >= 100 ? 2 : n >= 1 ? 4 : 6;
  return n.toLocaleString("en-US", {
    maximumFractionDigits: dp,
    minimumFractionDigits: 2,
  }) + " " + sym;
}
