import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";

const router = Router();
router.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Aggregate platform metrics:
 *   total_users, total_scans, scans_today, active_paid_users, scan_volume_7days
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsersResult,
      totalScansResult,
      scansTodayResult,
      activePaidResult,
      scan7DaysResult,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("wallet_scans").select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("wallet_scans")
        .select("*", { count: "exact", head: true })
        .gte("created_at", getTodayUTCStart()),
      supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .in("plan", ["pro", "business"]),
      supabaseAdmin
        .from("wallet_scans")
        .select("created_at")
        .gte("created_at", getDaysAgoUTCStart(7)),
    ]);

    const rawScans = (scan7DaysResult.data ?? []) as { created_at: string }[];
    const scanVolume7Days = buildDailyCounts(rawScans, 7);

    res.json({
      total_users: totalUsersResult.count ?? 0,
      total_scans: totalScansResult.count ?? 0,
      scans_today: scansTodayResult.count ?? 0,
      active_paid_users: activePaidResult.count ?? 0,
      scan_volume_7days: scanVolume7Days,
    });
  } catch (err) {
    console.error("[GET /admin/stats] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function getTodayUTCStart(): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

function getDaysAgoUTCStart(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString();
}

function buildDailyCounts(
  rows: { created_at: string }[],
  days: number
): { date: string; count: number }[] {
  const counts: Record<string, number> = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().split("T")[0];
    counts[key] = 0;
  }

  for (const row of rows) {
    const key = row.created_at.split("T")[0];
    if (key in counts) counts[key]++;
  }

  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}

export default router;
