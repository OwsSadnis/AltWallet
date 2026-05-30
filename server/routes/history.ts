import { Router, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { createClient } from "@supabase/supabase-js";

const historyRouter = Router();

// ─── Supabase client (server-side, service role) ────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Helper: resolve Clerk userId from request ───────────────────────────────
function getUserId(req: Request): string | null {
  const { userId } = getAuth(req);
  return userId ?? null;
}

// ─── Helper: map risk_score → Risk label ────────────────────────────────────
function scoreToRisk(score: number): string {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MED";
  return "SAFE";
}

// ─── Helper: format date → YYYY-MM-DD ────────────────────────────────────────
function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/history
// ════════════════════════════════════════════════════════════════════════════
historyRouter.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  console.log("[GET /api/history] userId:", userId);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ── Query params ──────────────────────────────────────────────────────────
  const chain = (req.query.chain as string | undefined) || undefined;
  const sort = (req.query.sort as string) || "newest";
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt((req.query.limit as string) || "10", 10))
  );
  const offset = (page - 1) * limit;

  // ── Sort mapping ──────────────────────────────────────────────────────────
  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    newest:  { column: "scanned_at",  ascending: false },
    oldest:  { column: "scanned_at",  ascending: true  },
    highest: { column: "risk_score",  ascending: false },
    lowest:  { column: "risk_score",  ascending: true  },
  };
  const { column: sortColumn, ascending } = sortMap[sort] ?? sortMap.newest;

  try {
    // ── Count query ───────────────────────────────────────────────────────
    let countQuery = supabase
      .from("wallet_scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (chain) countQuery = countQuery.eq("chain", chain);

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // ── Data query ────────────────────────────────────────────────────────
    let dataQuery = supabase
      .from("wallet_scans")
      .select("id, label, address, chain, risk_score, scanned_at")
      .eq("user_id", userId)
      .order(sortColumn, { ascending })
      .range(offset, offset + limit - 1);

    if (chain) dataQuery = dataQuery.eq("chain", chain);

    const { data: scans, error: dataError } = await dataQuery;
    if (dataError) throw dataError;

    return res.status(200).json({
      scans: scans ?? [],
      total,
      page,
      totalPages,
    });
  } catch (err: any) {
    console.error("[GET /api/history] Full error:", err);
    console.error("[GET /api/history] Error code:", err?.code);
    console.error("[GET /api/history] Error details:", err?.details);
    console.error("[GET /api/history] Error hint:", err?.hint);
    return res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PATCH /api/history/:id/label
// ════════════════════════════════════════════════════════════════════════════
historyRouter.patch("/:id/label", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const { label } = req.body as { label?: unknown };

  // ── Validation ─────────────────────────────────────────────────────────
  if (typeof label !== "string") {
    return res.status(400).json({ error: "label must be a string" });
  }

  const trimmedLabel = label.trim();

  if (trimmedLabel.length > 50) {
    return res
      .status(400)
      .json({ error: "label must be 50 characters or fewer" });
  }

  try {
    // ── Verify ownership + update ─────────────────────────────────────────
    const { data, error } = await supabase
      .from("wallet_scans")
      .update({ label: trimmedLabel || null })
      .eq("id", id)
      .eq("user_id", userId)   // ownership check
      .select("label")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Row not found or doesn't belong to this user
      return res
        .status(404)
        .json({ error: "Scan not found or access denied" });
    }

    return res.status(200).json({ success: true, label: data.label });
  } catch (err: any) {
    console.error("[PATCH /api/history/:id/label] Error:", err?.message ?? err);
    return res.status(500).json({ error: "Failed to update label" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/history/export
// NOTE: register this route BEFORE the generic "/:id" patterns so Express
// doesn't interpret "export" as a scan ID.
// ════════════════════════════════════════════════════════════════════════════
historyRouter.get("/export", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const chain = (req.query.chain as string | undefined) || undefined;

  try {
    let query = supabase
      .from("wallet_scans")
      .select("label, address, chain, risk_score, scanned_at")
      .eq("user_id", userId)
      .order("scanned_at", { ascending: false });

    if (chain) query = query.eq("chain", chain);

    const { data: scans, error } = await query;
    if (error) throw error;

    // ── Build CSV ─────────────────────────────────────────────────────────
    const header = "Label,Address,Chain,Score,Risk,Date";

    const rows = (scans ?? []).map((scan) => {
      const label =
        scan.label && scan.label.trim()
          ? scan.label.trim()
          : scan.address.slice(0, 8);

      const score = scan.risk_score ?? 0;
      const risk = scoreToRisk(score);
      const date = formatDate(scan.scanned_at);

      // Escape any commas/quotes inside CSV fields
      const escape = (val: string) =>
        val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"`
          : val;

      return [
        escape(label),
        escape(scan.address),
        escape(scan.chain),
        String(score),
        risk,
        date,
      ].join(",");
    });

    const csv = [header, ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="altwallet-history.csv"'
    );
    return res.status(200).send(csv);
  } catch (err: any) {
    console.error("[GET /api/history/export] Error:", err?.message ?? err);
    return res.status(500).json({ error: "Failed to export history" });
  }
});

export default historyRouter;
