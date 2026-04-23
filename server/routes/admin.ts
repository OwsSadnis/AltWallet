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
