/**
 * POST /api/scan
 * Body: { address: string, chain: "ETH"|"BTC"|"SOL"|"TRX"|"XRP"|"SUI", lang?: string }
 *
 * Plan enforcement:
 *   Free  → ETH + BTC only, max 3 scans/day
 *   Pro   → all 6 chains, unlimited
 *   Business → all 6 chains, unlimited
 *
 * Returns a ScanResult compatible with the client's ResultCards components.
 */

import { Router } from "express";
import { requireAuth, getEffectivePlan } from "../middleware/auth.js";
import { scanWithGoPlus } from "../services/goplus.js";
import { fetchChainData } from "../services/chainData.js";
import { generateAiSummary } from "../services/aiSummary.js";

export const scanRouter = Router();

const FREE_CHAINS = new Set(["ETH", "BTC"]);
const FREE_DAILY_LIMIT = 3;
const VALID_CHAINS = new Set(["ETH", "BTC", "SOL", "TRX", "XRP", "SUI"]);
const BETA_CHAINS = new Set(["XRP", "SUI"]);

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function getDailyCount(userId: string): Promise<number> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const res = await fetch(
    `${url}/rest/v1/wallet_scans?user_id=eq.${encodeURIComponent(userId)}&scanned_at=gte.${today.toISOString()}&select=id`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) return 0;
  const rows = (await res.json()) as unknown[];
  return rows.length;
}

async function saveScan(
  userId: string,
  address: string,
  chain: string,
  score: number,
  result: unknown
): Promise<string | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const res = await fetch(`${url}/rest/v1/wallet_scans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({ user_id: userId, address, chain, risk_score: score, result }),
  });
  if (!res.ok) {
    console.error("[scan] Supabase save failed:", await res.text());
    return null;
  }
  const rows = (await res.json()) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

// ─── Route ────────────────────────────────────────────────────────────────────
scanRouter.post("/", requireAuth, async (req, res) => {
  const { address, chain, lang = "EN" } = req.body as {
    address?: string;
    chain?: string;
    lang?: string;
  };

  if (!address || typeof address !== "string" || !address.trim()) {
    return res.status(400).json({ error: "Address is required." });
  }
  if (!chain || !VALID_CHAINS.has(chain)) {
    return res.status(400).json({ error: "Invalid chain. Must be ETH, BTC, SOL, TRX, XRP, or SUI." });
  }

  const userId = req.userId!;
  const plan = await getEffectivePlan(userId);

  // ── Plan enforcement ──────────────────────────────────────────────────────
  if (plan === "free") {
    if (!FREE_CHAINS.has(chain)) {
      return res.status(402).json({
        error: `${chain} chain requires Pro or Business plan.`,
        upgrade_url: "/pricing",
        code: "CHAIN_LOCKED",
      });
    }
    const count = await getDailyCount(userId);
    if (count >= FREE_DAILY_LIMIT) {
      return res.status(402).json({
        error: `Free plan limit reached (${FREE_DAILY_LIMIT} scans/day). Upgrade for unlimited scans.`,
        upgrade_url: "/pricing",
        code: "DAILY_LIMIT",
      });
    }
  }

  // ── GoPlus security scan ─────────────────────────────────────────────────
  let goPlusResult;
  try {
    goPlusResult = await scanWithGoPlus(address.trim(), chain);
  } catch (err) {
    console.warn("[scan] GoPlus failed:", err);
    goPlusResult = {
      score: 60,
      redFlags: [],
      yellowFlags: [{ id: "limited_data", title: "Limited data available", detail: "Security scoring data could not be retrieved for this address. Treat with caution." }],
      greenSignals: [],
      rawFlags: {},
    };
  }

  // ── Chain-specific transaction data ──────────────────────────────────────
  let chainData;
  try {
    chainData = await fetchChainData(address.trim(), chain);
  } catch (err) {
    console.warn("[scan] Chain data fetch failed:", err);
    chainData = { txHistory: [], walletAge: "Unknown", txCount: 0, totalVolumeUsd: "N/A", counterparties: 0, firstSeenTs: null };
  }

  // ── Beta chain cap ────────────────────────────────────────────────────────
  let finalScore = goPlusResult.score;
  if (BETA_CHAINS.has(chain)) {
    finalScore = Math.min(80, Math.round(finalScore * 0.8));
  }

  // ── Enrich flags with wallet age signals ─────────────────────────────────
  const { firstSeenTs } = chainData;
  if (firstSeenTs) {
    const ageMs = Date.now() - firstSeenTs * 1000;
    const ageDays = ageMs / 86_400_000;
    if (ageDays < 30) {
      finalScore = Math.max(0, finalScore - 10);
      goPlusResult.yellowFlags.push({
        id: "new_wallet",
        title: "New wallet (under 30 days)",
        detail: "This wallet was created less than 30 days ago. Young wallets carry more uncertainty because there is little history to evaluate.",
      });
    } else if (ageDays > 365) {
      goPlusResult.greenSignals.push({
        id: "wallet_age",
        title: "Wallet older than 1 year",
        detail: "Long-lived wallets with consistent activity are generally lower risk.",
      });
    }
  }

  // ── AI summary (Pro/Business only) ────────────────────────────────────────
  let aiSummary = "";
  if (plan !== "free") {
    try {
      aiSummary = await generateAiSummary({
        address: address.trim(),
        chain,
        score: finalScore,
        redFlags: goPlusResult.redFlags.map((f) => f.title),
        yellowFlags: goPlusResult.yellowFlags.map((f) => f.title),
        greenSignals: goPlusResult.greenSignals.map((f) => f.title),
        lang,
      });
    } catch (err) {
      console.warn("[scan] AI summary failed:", err);
    }
  }

  // ── Assemble result ───────────────────────────────────────────────────────
  const scanResult = {
    address: address.trim(),
    chain,
    score: finalScore,
    delta: 0,
    walletAge: chainData.walletAge,
    txCount: chainData.txCount,
    totalVolume: chainData.totalVolumeUsd,
    counterparties: chainData.counterparties,
    redFlags: goPlusResult.redFlags,
    yellowFlags: goPlusResult.yellowFlags,
    greenSignals: goPlusResult.greenSignals,
    txHistory: chainData.txHistory,
    aiSummary,
    exposure: "N/A",
    activeApprovals: 0,
    lastActivity: chainData.firstSeenTs
      ? `${Math.floor((Date.now() - chainData.firstSeenTs * 1000) / 3_600_000)}h ago`
      : "Unknown",
  };

  // ── Persist ───────────────────────────────────────────────────────────────
  const scanId = await saveScan(userId, address.trim(), chain, finalScore, scanResult);

  return res.json({ ...scanResult, scanId, plan });
});
