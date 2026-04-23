/**
 * Chain-specific transaction data fetchers.
 * Each returns a normalised TxRow[] and optional walletAge/txCount.
 */

export interface TxRow {
  date: string;
  type: string;
  amount: string;
  token: string;
  counterparty: string;
  chain: string;
  risk?: "safe" | "medium" | "high";
}

export interface ChainData {
  txHistory: TxRow[];
  walletAge: string;
  txCount: number;
  totalVolumeUsd: string;
  counterparties: number;
  firstSeenTs: number | null;
}

const EMPTY: ChainData = {
  txHistory: [],
  walletAge: "Unknown",
  txCount: 0,
  totalVolumeUsd: "N/A",
  counterparties: 0,
  firstSeenTs: null,
};

// ─── Formatting helpers ───────────────────────────────────────────────────────
function formatAge(firstTsSeconds: number): string {
  const ageMs = Date.now() - firstTsSeconds * 1000;
  const days = Math.floor(ageMs / 86_400_000);
  if (days < 1) return "< 1 day";
  if (days < 30) return `${days} day${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}y ${rem}m` : `${years} year${years > 1 ? "s" : ""}`;
}

function shortAddr(addr: string): string {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 7)}…${addr.slice(-5)}`;
}

function tsToDateLabel(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// ─── Ethereum (Etherscan) ─────────────────────────────────────────────────────
interface EthTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  isError: string;
  functionName?: string;
  tokenSymbol?: string;
}

export async function fetchEthData(address: string): Promise<ChainData> {
  const key = process.env.ETHERSCAN_API_KEY || "";
  const base = `https://api.etherscan.io/api`;
  const addr = address.toLowerCase();

  // Fetch recent + oldest tx in parallel
  const [recentRes, oldestRes] = await Promise.allSettled([
    fetch(`${base}?module=account&action=txlist&address=${addr}&page=1&offset=20&sort=desc&apikey=${key}`, { signal: AbortSignal.timeout(7000) }),
    fetch(`${base}?module=account&action=txlist&address=${addr}&page=1&offset=1&sort=asc&apikey=${key}`, { signal: AbortSignal.timeout(7000) }),
  ]);

  let txs: EthTx[] = [];
  let firstTs: number | null = null;

  if (recentRes.status === "fulfilled" && recentRes.value.ok) {
    const data = (await recentRes.value.json()) as { status: string; result: EthTx[] };
    if (data.status === "1" && Array.isArray(data.result)) txs = data.result;
  }

  if (oldestRes.status === "fulfilled" && oldestRes.value.ok) {
    const data = (await oldestRes.value.json()) as { status: string; result: EthTx[] };
    if (data.status === "1" && data.result?.[0]) {
      firstTs = parseInt(data.result[0].timeStamp);
    }
  }

  const addrLow = address.toLowerCase();
  const seenCounterparties = new Set<string>();
  let totalWei = BigInt(0);

  const txHistory: TxRow[] = txs.slice(0, 15).map((tx) => {
    const isOut = tx.from.toLowerCase() === addrLow;
    const counterparty = isOut ? tx.to : tx.from;
    seenCounterparties.add(counterparty);
    const ethAmt = (parseInt(tx.value) / 1e18).toFixed(4);
    totalWei += BigInt(tx.value);
    const type = tx.functionName
      ? tx.functionName.split("(")[0].slice(0, 20)
      : isOut
      ? "Transfer out"
      : "Transfer in";

    return {
      date: tsToDateLabel(parseInt(tx.timeStamp)),
      type,
      amount: ethAmt,
      token: "ETH",
      counterparty: shortAddr(counterparty),
      chain: "ETH",
      risk: "safe",
    };
  });

  return {
    txHistory,
    walletAge: firstTs ? formatAge(firstTs) : "Unknown",
    txCount: txs.length,
    totalVolumeUsd: "N/A",
    counterparties: seenCounterparties.size,
    firstSeenTs: firstTs,
  };
}

// ─── Solana (Helius) ──────────────────────────────────────────────────────────
interface HeliusTx {
  timestamp?: number;
  type?: string;
  fee?: number;
  accountData?: Array<{ account: string }>;
  nativeTransfers?: Array<{ fromUserAccount: string; toUserAccount: string; amount: number }>;
}

export async function fetchSolData(address: string): Promise<ChainData> {
  const key = process.env.HELIUS_API_KEY;
  if (!key) return EMPTY;

  const res = await fetch(
    `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${key}&limit=20`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return EMPTY;

  const txs = (await res.json()) as HeliusTx[];
  if (!Array.isArray(txs) || txs.length === 0) return EMPTY;

  const txHistory: TxRow[] = txs.slice(0, 15).map((tx) => {
    const transfer = tx.nativeTransfers?.[0];
    const isOut = transfer?.fromUserAccount === address;
    const counterparty = isOut
      ? (transfer?.toUserAccount ?? "unknown")
      : (transfer?.fromUserAccount ?? "unknown");
    const amt = transfer ? (transfer.amount / 1e9).toFixed(4) : "0";

    return {
      date: tx.timestamp ? tsToDateLabel(tx.timestamp) : "—",
      type: tx.type ?? "Transaction",
      amount: amt,
      token: "SOL",
      counterparty: shortAddr(counterparty),
      chain: "SOL",
      risk: "safe",
    };
  });

  const firstTs = txs[txs.length - 1]?.timestamp ?? null;
  return {
    txHistory,
    walletAge: firstTs ? formatAge(firstTs) : "Unknown",
    txCount: txs.length,
    totalVolumeUsd: "N/A",
    counterparties: new Set(txHistory.map((t) => t.counterparty)).size,
    firstSeenTs: firstTs,
  };
}

// ─── TRON (Tronscan) ──────────────────────────────────────────────────────────
interface TronTx {
  timestamp?: number;
  ownerAddress?: string;
  toAddress?: string;
  amount?: number;
  tokenInfo?: { tokenAbbr?: string };
  contractType?: number;
}

export async function fetchTrxData(address: string): Promise<ChainData> {
  const res = await fetch(
    `https://apilist.tronscan.org/api/transaction?sort=-timestamp&count=true&limit=20&start=0&address=${encodeURIComponent(address)}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return EMPTY;

  const body = (await res.json()) as { data?: TronTx[]; total?: number };
  const txs = body.data ?? [];

  const txHistory: TxRow[] = txs.slice(0, 15).map((tx) => {
    const isOut = tx.ownerAddress === address;
    const counterparty = isOut ? (tx.toAddress ?? "unknown") : (tx.ownerAddress ?? "unknown");
    const amt = tx.amount != null ? (tx.amount / 1e6).toFixed(4) : "0";
    const token = tx.tokenInfo?.tokenAbbr ?? "TRX";

    return {
      date: tx.timestamp ? tsToDateLabel(Math.floor(tx.timestamp / 1000)) : "—",
      type: isOut ? "Transfer out" : "Transfer in",
      amount: amt,
      token,
      counterparty: shortAddr(counterparty),
      chain: "TRX",
      risk: "safe",
    };
  });

  const firstTs =
    txs.length > 0 && txs[txs.length - 1]?.timestamp
      ? Math.floor(txs[txs.length - 1]!.timestamp! / 1000)
      : null;

  return {
    txHistory,
    walletAge: firstTs ? formatAge(firstTs) : "Unknown",
    txCount: body.total ?? txs.length,
    totalVolumeUsd: "N/A",
    counterparties: new Set(txHistory.map((t) => t.counterparty)).size,
    firstSeenTs: firstTs,
  };
}

// ─── BTC / XRP / SUI — GoPlus-only, no tx explorer data ─────────────────────
export async function fetchBtcData(_address: string): Promise<ChainData> {
  return EMPTY; // GoPlus score is the primary signal; tx explorer not configured
}

export async function fetchXrpData(_address: string): Promise<ChainData> {
  return EMPTY;
}

export async function fetchSuiData(_address: string): Promise<ChainData> {
  return EMPTY;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
export async function fetchChainData(
  address: string,
  chain: string
): Promise<ChainData> {
  switch (chain) {
    case "ETH": return fetchEthData(address);
    case "BTC": return fetchBtcData(address);
    case "SOL": return fetchSolData(address);
    case "TRX": return fetchTrxData(address);
    case "XRP": return fetchXrpData(address);
    case "SUI": return fetchSuiData(address);
    default: return EMPTY;
  }
}
