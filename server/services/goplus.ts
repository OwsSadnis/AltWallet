/**
 * GoPlus Security API — address risk scoring for all 6 chains.
 * Docs: https://docs.gopluslabs.io/reference/api-overview
 */

const API_BASE = "https://api.gopluslabs.io";

// GoPlus chain identifiers
const CHAIN_ID: Record<string, string> = {
  ETH: "1",
  BTC: "0",
  TRX: "tron",
  SOL: "solana",
  XRP: "xrp",
  SUI: "sui",
};

interface GoPlusFlags {
  is_blacklisted?: string;
  is_phishing_activities?: string;
  is_sanctioned?: string;
  cybercrime?: string;
  money_laundering?: string;
  financial_crime?: string;
  stealing_attack?: string;
  blackmail_activities?: string;
  is_honeypot?: string;
  blacklist_doubt?: string;
  darkweb_transactions?: string;
  malicious_behavior?: Array<{ name?: string; description?: string }>;
  create_code?: string;
  [key: string]: unknown;
}

export interface ScanFlag {
  id: string;
  title: string;
  detail: string;
}

export interface GoPlusScanResult {
  score: number;
  redFlags: ScanFlag[];
  yellowFlags: ScanFlag[];
  greenSignals: ScanFlag[];
  rawFlags: GoPlusFlags;
}

function f1(v?: string) {
  return v === "1";
}

function computeScore(flags: GoPlusFlags): Omit<GoPlusScanResult, "rawFlags"> {
  let score = 100;
  const redFlags: ScanFlag[] = [];
  const yellowFlags: ScanFlag[] = [];
  const greenSignals: ScanFlag[] = [];

  if (f1(flags.is_blacklisted)) {
    score -= 40;
    redFlags.push({ id: "blacklisted", title: "Blacklisted address", detail: "This address appears on a security blacklist maintained by GoPlus. It has been associated with confirmed malicious activity." });
  }
  if (f1(flags.is_phishing_activities)) {
    score -= 35;
    redFlags.push({ id: "phishing", title: "Phishing activity detected", detail: "This address has been linked to phishing campaigns that target crypto users to steal funds or credentials." });
  }
  if (f1(flags.is_sanctioned)) {
    score -= 40;
    redFlags.push({ id: "sanctioned", title: "Sanctioned counterparty", detail: "This address appears on OFAC or equivalent government sanctions lists. Transacting with sanctioned entities may have legal consequences in your jurisdiction." });
  }
  if (f1(flags.cybercrime)) {
    score -= 30;
    redFlags.push({ id: "cybercrime", title: "Cybercrime association", detail: "This address has been linked to cybercrime activities including hacks, exploits, or ransom payments." });
  }
  if (f1(flags.money_laundering)) {
    score -= 30;
    redFlags.push({ id: "laundering", title: "Money laundering pattern", detail: "Transaction patterns associated with this address are consistent with layering or money laundering heuristics detected by GoPlus." });
  }
  if (f1(flags.financial_crime)) {
    score -= 30;
    redFlags.push({ id: "financial_crime", title: "Financial crime exposure", detail: "This address has been flagged by GoPlus for involvement in financial crime activities." });
  }
  if (f1(flags.stealing_attack)) {
    score -= 35;
    redFlags.push({ id: "stealing", title: "Theft / drainer attack", detail: "This address has been associated with wallet drainer attacks or direct theft of user funds." });
  }
  if (f1(flags.is_honeypot)) {
    score -= 40;
    redFlags.push({ id: "honeypot", title: "Honeypot contract", detail: "This contract has characteristics of a honeypot — a trap that allows anyone to deposit but prevents withdrawal, designed to steal funds." });
  }
  if (f1(flags.darkweb_transactions)) {
    score -= 25;
    redFlags.push({ id: "darkweb", title: "Dark web transaction link", detail: "Funds from this address have been traced to dark web marketplaces or illicit services." });
  }
  if (f1(flags.blackmail_activities)) {
    score -= 25;
    redFlags.push({ id: "blackmail", title: "Blackmail / extortion activity", detail: "This address has been associated with blackmail or extortion schemes targeting individuals or organisations." });
  }

  if (Array.isArray(flags.malicious_behavior) && flags.malicious_behavior.length > 0) {
    const mb = flags.malicious_behavior;
    score -= Math.min(35, mb.length * 12);
    mb.slice(0, 2).forEach((b, i) => {
      redFlags.push({
        id: `mb_${i}`,
        title: b.name || "Malicious on-chain behavior",
        detail: b.description || "GoPlus security analysis detected malicious on-chain behavior for this address.",
      });
    });
  }

  // Yellow flags
  if (f1(flags.blacklist_doubt)) {
    score -= 20;
    yellowFlags.push({ id: "blacklist_doubt", title: "Suspicious activity (unconfirmed)", detail: "This address shows patterns consistent with blacklisted wallets but has not been formally confirmed by GoPlus." });
  }

  // Green signals (only if clean)
  if (redFlags.length === 0 && !f1(flags.blacklist_doubt)) {
    greenSignals.push({ id: "no_blacklist", title: "No sanctions matches", detail: "No direct exposure to sanctioned entities, blacklisted addresses, or known dark web services was detected." });
    greenSignals.push({ id: "clean_profile", title: "Clean security profile", detail: "GoPlus security analysis found no phishing, cybercrime, or malicious behavior associations for this address." });
  }

  return { score: Math.max(0, Math.min(100, score)), redFlags, yellowFlags, greenSignals };
}

export async function scanWithGoPlus(
  address: string,
  chain: string
): Promise<GoPlusScanResult> {
  const chainId = CHAIN_ID[chain];
  if (!chainId) throw new Error(`GoPlus: unsupported chain ${chain}`);

  const apiKey = process.env.GOPLUS_API_KEY;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["Authorization"] = apiKey;

  const url = `${API_BASE}/api/v1/address_security/${encodeURIComponent(address)}?chain_id=${chainId}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });

  if (!res.ok) throw new Error(`GoPlus HTTP ${res.status}`);

  const body = (await res.json()) as { code: number; message: string; result?: GoPlusFlags };

  if (body.code !== 1 || !body.result) {
    // GoPlus returned success=false or empty — treat as no data
    const fallback = computeScore({});
    fallback.score = 65; // neutral-low score when no data
    fallback.yellowFlags.push({
      id: "no_data",
      title: "Limited data available",
      detail: "GoPlus returned no risk data for this address. This may mean it is a new address or unsupported by the current data sources.",
    });
    return { ...fallback, rawFlags: {} };
  }

  const computed = computeScore(body.result);
  return { ...computed, rawFlags: body.result };
}
