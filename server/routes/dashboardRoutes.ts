import { Router } from "express";
import {
  requireAuth,
  requireBusinessPlan,
  getPlanFromClerk,
} from "../middleware/auth.js";

const router = Router();

const PLAN_LIMITS: Record<string, number> = { free: 3, pro: 50, business: 200 };

function sbUrl() {
  return process.env.SUPABASE_URL!;
}
function sbHeaders(): Record<string, string> {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" };
}

// Count rows in wallet_scans for userId, optionally filtering by scanned_at >= gte
async function countScans(userId: string, gte?: string): Promise<number> {
  let url = `${sbUrl()}/rest/v1/wallet_scans?user_id=eq.${encodeURIComponent(userId)}&select=id`;
  if (gte) url += `&scanned_at=gte.${encodeURIComponent(gte)}`;
  const res = await fetch(url, {
    headers: { ...sbHeaders(), Prefer: "count=exact" },
  });
  if (!res.ok) return 0;
  const cr = res.headers.get("content-range");
  if (cr) {
    const total = cr.split("/")[1];
    return total ? (parseInt(total, 10) || 0) : 0;
  }
  // Fallback: count the array
  const rows = (await res.json()) as unknown[];
  return rows.length;
}

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req, res) => {
  const userId = req.userId!;

  try {
    const plan = await getPlanFromClerk(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [allScansRes, scansToday, scansThisMonth] = await Promise.all([
      fetch(
        `${sbUrl()}/rest/v1/wallet_scans?user_id=eq.${encodeURIComponent(userId)}&select=risk_score,chain`,
        { headers: sbHeaders() }
      ),
      countScans(userId, today.toISOString()),
      countScans(userId, monthStart.toISOString()),
    ]);

    if (!allScansRes.ok) throw new Error("Failed to fetch scans");

    const allScans = (await allScansRes.json()) as Array<{
      risk_score: number | null;
      chain: string | null;
    }>;

    const totalScans = allScans.length;
    const flaggedCount = allScans.filter(
      (s) => s.risk_score !== null && s.risk_score < 40
    ).length;
    const chainSet = new Set<string>();
    for (const s of allScans) {
      if (s.chain) chainSet.add(s.chain);
    }
    const chainsUsed = Array.from(chainSet);

    return res.json({
      total_scans: totalScans,
      flagged_count: flaggedCount,
      chains_used: chainsUsed,
      scans_today: scansToday,
      scans_this_month: scansThisMonth,
      daily_limit: PLAN_LIMITS[plan] ?? PLAN_LIMITS.free,
    });
  } catch (err: unknown) {
    console.error("[dashboard/stats]", err);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─── GET /api/dashboard/recent-scans ─────────────────────────────────────────
router.get("/recent-scans", requireAuth, async (req, res) => {
  const userId = req.userId!;

  try {
    const scansRes = await fetch(
      `${sbUrl()}/rest/v1/wallet_scans?user_id=eq.${encodeURIComponent(userId)}&order=scanned_at.desc&limit=5&select=id,address,chain,risk_score,label,scanned_at`,
      { headers: sbHeaders() }
    );

    if (!scansRes.ok) throw new Error("Failed to fetch scans");

    const scans = await scansRes.json();
    return res.json({ scans: scans ?? [] });
  } catch (err: unknown) {
    console.error("[dashboard/recent-scans]", err);
    return res.status(500).json({ error: "Failed to fetch recent scans" });
  }
});

// ─── GET /api/dashboard/export/csv ────────────────────────────────────────────
router.get("/export/csv", requireAuth, async (req, res) => {
  const userId = req.userId!;

  try {
    const plan = await getPlanFromClerk(userId);
    if (plan === "free") {
      return res.status(403).json({ error: "CSV export requires Pro or Business plan" });
    }

    const scansRes = await fetch(
      `${sbUrl()}/rest/v1/wallet_scans?user_id=eq.${encodeURIComponent(userId)}&order=scanned_at.desc&select=address,chain,risk_score,label,scanned_at`,
      { headers: sbHeaders() }
    );

    if (!scansRes.ok) throw new Error("Failed to fetch scans");

    const rows = (await scansRes.json()) as Array<{
      address: string | null;
      chain: string | null;
      risk_score: number | null;
      label: string | null;
      scanned_at: string | null;
    }>;

    const escape = (val: unknown): string => {
      if (val === null || val === undefined) return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const header = "address,chain,risk_score,label,scanned_at";
    const lines = rows.map((r) =>
      [r.address, r.chain, r.risk_score, r.label, r.scanned_at].map(escape).join(",")
    );
    const csv = [header, ...lines].join("\n");
    const filename = `altwallet-scans-${userId.slice(0, 8)}-${Date.now()}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err: unknown) {
    console.error("[dashboard/export/csv]", err);
    return res.status(500).json({ error: "Failed to export CSV" });
  }
});

// ─── GET /api/dashboard/team ──────────────────────────────────────────────────
router.get("/team", requireAuth, requireBusinessPlan, async (req, res) => {
  const userId = req.userId!;

  try {
    const teamRes = await fetch(
      `${sbUrl()}/rest/v1/team_seats?owner_id=eq.${encodeURIComponent(userId)}&status=neq.removed&order=invited_at.desc&select=id,member_email,member_id,status,invited_at,joined_at`,
      { headers: sbHeaders() }
    );

    if (!teamRes.ok) throw new Error("Failed to fetch team");

    const team = await teamRes.json();
    return res.json({ team: team ?? [] });
  } catch (err: unknown) {
    console.error("[dashboard/team]", err);
    return res.status(500).json({ error: "Failed to fetch team" });
  }
});

// ─── POST /api/dashboard/team/invite ─────────────────────────────────────────
router.post("/team/invite", requireAuth, requireBusinessPlan, async (req, res) => {
  const userId = req.userId!;
  const { email } = req.body as { email?: string };

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Count existing active seats
    const countRes = await fetch(
      `${sbUrl()}/rest/v1/team_seats?owner_id=eq.${encodeURIComponent(userId)}&status=neq.removed&select=id`,
      { headers: { ...sbHeaders(), Prefer: "count=exact" } }
    );
    const cr = countRes.headers.get("content-range");
    const existing = cr ? (parseInt(cr.split("/")[1] ?? "0", 10) || 0) : 0;

    if (existing >= 3) {
      return res.status(400).json({ error: "Maximum of 3 team seats reached for Business plan" });
    }

    // Check for duplicate
    const dupRes = await fetch(
      `${sbUrl()}/rest/v1/team_seats?owner_id=eq.${encodeURIComponent(userId)}&member_email=eq.${encodeURIComponent(normalizedEmail)}&status=neq.removed&select=id&limit=1`,
      { headers: sbHeaders() }
    );
    const dupRows = (await dupRes.json()) as unknown[];
    if (dupRows.length > 0) {
      return res.status(409).json({ error: `${normalizedEmail} has already been invited` });
    }

    // Insert
    const insertRes = await fetch(`${sbUrl()}/rest/v1/team_seats`, {
      method: "POST",
      headers: { ...sbHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({
        owner_id: userId,
        member_email: normalizedEmail,
        status: "pending",
      }),
    });

    if (!insertRes.ok) throw new Error(await insertRes.text());

    const rows = (await insertRes.json()) as unknown[];
    return res.status(201).json({ seat: rows[0] });
  } catch (err: unknown) {
    console.error("[dashboard/team/invite]", err);
    return res.status(500).json({ error: "Failed to invite member" });
  }
});

// ─── DELETE /api/dashboard/team/:memberId ─────────────────────────────────────
router.delete("/team/:memberId", requireAuth, requireBusinessPlan, async (req, res) => {
  const userId = req.userId!;
  const { memberId } = req.params;

  if (!memberId) {
    return res.status(400).json({ error: "memberId is required" });
  }

  try {
    // Verify seat belongs to this owner
    const checkRes = await fetch(
      `${sbUrl()}/rest/v1/team_seats?id=eq.${encodeURIComponent(memberId)}&owner_id=eq.${encodeURIComponent(userId)}&status=neq.removed&select=id&limit=1`,
      { headers: sbHeaders() }
    );
    const rows = (await checkRes.json()) as unknown[];
    if (rows.length === 0) {
      return res.status(404).json({ error: "Team seat not found" });
    }

    // Soft delete
    const updateRes = await fetch(
      `${sbUrl()}/rest/v1/team_seats?id=eq.${encodeURIComponent(memberId)}&owner_id=eq.${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        headers: { ...sbHeaders(), Prefer: "return=minimal" },
        body: JSON.stringify({ status: "removed", removed_at: new Date().toISOString() }),
      }
    );

    if (!updateRes.ok) throw new Error(await updateRes.text());

    return res.json({ success: true, removed_id: memberId });
  } catch (err: unknown) {
    console.error("[dashboard/team/:memberId DELETE]", err);
    return res.status(500).json({ error: "Failed to remove team member" });
  }
});

export default router;
