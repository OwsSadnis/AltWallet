/**
 * Admin endpoints — requires Clerk publicMetadata.role === 'admin'
 *
 * GET   /api/admin/users                — list all users from profiles table
 * GET   /api/admin/tokens               — list all tokens + used/unused status
 * GET   /api/admin/scans                — list all scan history
 * PATCH /api/admin/users/:userId/plan   — manual override user plan
 */

import { Router } from "express";
import { clerkClient } from "@clerk/express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { customAlphabet } from "nanoid";

export const adminRouter = Router();

// All admin routes require auth + admin role
adminRouter.use(requireAuth, requireAdmin);

// ─── Supabase helpers ─────────────────────────────────────────────────────────

function sbHeaders(extra?: Record<string, string>) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

function sbUrl() {
  return process.env.SUPABASE_URL!;
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
adminRouter.get("/users", async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  const profilesRes = await fetch(
    `${sbUrl()}/rest/v1/profiles?order=created_at.desc&limit=500`,
    { headers: sbHeaders() }
  );

  if (!profilesRes.ok) {
    console.error("[admin] Failed to fetch profiles:", await profilesRes.text());
    return res.status(500).json({ success: false, error: "Failed to fetch users." });
  }

  const users = await profilesRes.json();
  return res.json({ success: true, users });
});

// ─── GET /api/admin/tokens ────────────────────────────────────────────────────
adminRouter.get("/tokens", async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  const tokensRes = await fetch(
    `${sbUrl()}/rest/v1/tokens?order=created_at.desc&limit=500`,
    { headers: sbHeaders() }
  );

  if (!tokensRes.ok) {
    console.error("[admin] Failed to fetch tokens:", await tokensRes.text());
    return res.status(500).json({ success: false, error: "Failed to fetch tokens." });
  }

  const tokens = await tokensRes.json();
  return res.json({ success: true, tokens });
});

// ─── GET /api/admin/scans ─────────────────────────────────────────────────────
adminRouter.get("/scans", async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  const scansRes = await fetch(
    `${sbUrl()}/rest/v1/wallet_scans?order=scanned_at.desc&limit=500`,
    { headers: sbHeaders() }
  );

  if (!scansRes.ok) {
    console.error("[admin] Failed to fetch scans:", await scansRes.text());
    return res.status(500).json({ success: false, error: "Failed to fetch scans." });
  }

  const scans = await scansRes.json();
  return res.json({ success: true, scans });
});

// ─── POST /api/admin/generate-token ──────────────────────────────────────────
const genSuffix = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

adminRouter.post("/generate-token", async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  const { plan, quantity } = req.body as { plan?: unknown; quantity?: unknown };

  const VALID_PLANS = new Set(["pro", "business"]);
  if (typeof plan !== "string" || !VALID_PLANS.has(plan)) {
    return res.status(400).json({ success: false, error: "plan must be 'pro' or 'business'." });
  }

  const qty =
    typeof quantity === "number" ? Math.min(Math.max(1, Math.floor(quantity)), 50) : 1;

  const tokens: string[] = [];
  for (let i = 0; i < qty; i++) {
    tokens.push(`BETA-AW-${genSuffix()}`);
  }

  const rows = tokens.map((token) => ({
    token,
    plan,
    used: false,
    created_at: new Date().toISOString(),
    source: "admin",
  }));

  const insertRes = await fetch(`${sbUrl()}/rest/v1/tokens`, {
    method: "POST",
    headers: sbHeaders({
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    }),
    body: JSON.stringify(rows),
  });

  if (!insertRes.ok) {
    console.error("[admin] Token insert failed:", await insertRes.text());
    return res.status(500).json({ success: false, error: "Failed to save tokens." });
  }

  return res.json({ success: true, tokens });
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
adminRouter.get("/stats", async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const scansRes = await fetch(
    `${sbUrl()}/rest/v1/wallet_scans?scanned_at=gte.${ninetyDaysAgo.toISOString()}&select=chain,user_id,scanned_at&limit=5000`,
    { headers: sbHeaders() }
  );

  if (!scansRes.ok) {
    return res.status(500).json({ success: false, error: "Failed to fetch scans." });
  }

  const scans = (await scansRes.json()) as Array<{ chain: string; user_id: string; scanned_at: string }>;

  const todayCount = scans.filter((s) => new Date(s.scanned_at) >= todayStart).length;
  const weekCount = scans.filter((s) => new Date(s.scanned_at) >= weekStart).length;
  const monthCount = scans.filter((s) => new Date(s.scanned_at) >= monthStart).length;

  const chainMap: Record<string, number> = {};
  scans.forEach((s) => { chainMap[s.chain] = (chainMap[s.chain] || 0) + 1; });

  const activeUsers = new Set(
    scans.filter((s) => new Date(s.scanned_at) >= weekStart).map((s) => s.user_id)
  ).size;

  return res.json({
    success: true,
    today: todayCount,
    week: weekCount,
    month: monthCount,
    chains: chainMap,
    active_users: activeUsers,
  });
});

// ─── GET /api/admin/api-monitor ───────────────────────────────────────────────
adminRouter.get("/api-monitor", async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const scansRes = await fetch(
    `${sbUrl()}/rest/v1/wallet_scans?scanned_at=gte.${todayStart.toISOString()}&select=chain,ai_summary`,
    { headers: sbHeaders() }
  );

  if (!scansRes.ok) {
    return res.status(500).json({ success: false, error: "Failed to fetch scans." });
  }

  const scans = (await scansRes.json()) as Array<{ chain: string; ai_summary: string | null }>;

  const goplusChains = new Set(["eth", "bsc", "trx", "sol", "xrp", "sui"]);
  const goplusCount = scans.filter((s) => goplusChains.has(s.chain)).length;
  const ethCount = scans.filter((s) => s.chain === "eth").length;
  const solCount = scans.filter((s) => s.chain === "sol").length;
  const trxCount = scans.filter((s) => s.chain === "trx").length;
  const haikuCount = scans.filter((s) => s.ai_summary != null).length;

  return res.json({
    success: true,
    services: [
      { name: "GoPlus", calls_today: goplusCount, limit: 10000 },
      { name: "Etherscan", calls_today: ethCount, limit: 100000 },
      { name: "Helius", calls_today: solCount, limit: 100000 },
      { name: "Tronscan", calls_today: trxCount, limit: 50000 },
      { name: "Claude Haiku", calls_today: haikuCount, limit: null },
    ],
  });
});

// ─── GET /api/admin/announcements ─────────────────────────────────────────────
adminRouter.get("/announcements", async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  const listRes = await fetch(
    `${sbUrl()}/rest/v1/announcements?order=created_at.desc&limit=50`,
    { headers: sbHeaders() }
  );

  if (!listRes.ok) {
    console.error("[admin] announcements list failed:", await listRes.text());
    return res.status(500).json({ success: false, error: "Failed to fetch announcements." });
  }

  const announcements = await listRes.json();
  return res.json({ success: true, announcements });
});

// ─── POST /api/admin/announcements ────────────────────────────────────────────
adminRouter.post("/announcements", async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  const { message, expires_at } = req.body as { message?: unknown; expires_at?: unknown };

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, error: "message is required." });
  }

  const row: Record<string, unknown> = { message: message.trim(), active: true };
  if (typeof expires_at === "string" && expires_at) {
    row.expires_at = expires_at;
  }

  const insertRes = await fetch(`${sbUrl()}/rest/v1/announcements`, {
    method: "POST",
    headers: sbHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });

  if (!insertRes.ok) {
    console.error("[admin] announcements insert failed:", await insertRes.text());
    return res.status(500).json({ success: false, error: "Failed to create announcement." });
  }

  const rows = (await insertRes.json()) as unknown[];
  return res.status(201).json({ success: true, announcement: rows[0] ?? null });
});

// ─── PATCH /api/admin/announcements/:id (deactivate) ─────────────────────────
adminRouter.patch("/announcements/:id", async (req, res) => {
  const { id } = req.params;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  const patchRes = await fetch(
    `${sbUrl()}/rest/v1/announcements?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: sbHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ active: false }),
    }
  );

  if (!patchRes.ok) {
    console.error("[admin] announcements patch failed:", await patchRes.text());
    return res.status(500).json({ success: false, error: "Failed to deactivate announcement." });
  }

  return res.json({ success: true });
});

// ─── PATCH /api/admin/users/:userId/plan ─────────────────────────────────────
adminRouter.patch("/users/:userId/plan", async (req, res) => {
  const { userId } = req.params;
  const { plan } = req.body as { plan?: unknown };

  const VALID_PLANS = new Set(["free", "pro", "business"]);
  if (typeof plan !== "string" || !VALID_PLANS.has(plan)) {
    return res.status(400).json({
      success: false,
      error: "plan must be 'free', 'pro', or 'business'.",
    });
  }

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ success: false, error: "userId is required." });
  }

  // Update Clerk publicMetadata
  try {
    await clerkClient.users.updateUser(userId, {
      publicMetadata: { plan },
    });
  } catch (err) {
    console.error("[admin] Clerk updateUser failed:", err);
    return res.status(500).json({ success: false, error: "Failed to update user plan in Clerk." });
  }

  // Sync to Supabase profiles (best effort — Clerk is source of truth)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const patchRes = await fetch(
      `${sbUrl()}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        headers: sbHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ plan, updated_at: new Date().toISOString() }),
      }
    );
    if (!patchRes.ok) {
      console.warn("[admin] Supabase profile sync failed (non-fatal):", await patchRes.text());
    }
  }

  return res.json({ success: true, userId, plan });
});
