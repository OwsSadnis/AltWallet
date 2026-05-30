import { Router, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

const historyRouter = Router();

function getUserId(req: Request): string | null {
  const { userId } = getAuth(req);
  return userId ?? null;
}

function scoreToRisk(score: number): string {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MED";
  return "SAFE";
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/history
// ════════════════════════════════════════════════════════════════════════════
historyRouter.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const chain = (req.query.chain as string | undefined) || undefined;
  const sort = (req.query.sort as string) || "newest";
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt((req.query.limit as string) || "10", 10))
  );
  const offset = (page - 1) * limit;

  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    newest:  { column: "scanned_at", ascending: false },
    oldest:  { column: "scanned_at", ascending: true  },
    highest: { column: "risk_score", ascending: false },
    lowest:  { column: "risk_score", ascending: true  },
  };
  const { column: sortColumn, ascending } = sortMap[sort] ?? sortMap.newest;

  try {
    // Count query
    let countQuery = supabaseAdmin
      .from("wallet_scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (chain) countQuery = countQuery.eq("chain", chain);

    const countResult = await (countQuery as unknown as Promise<{ count: number | null; error: { message: string } | null }>);
    if (countResult.error) throw new Error(countResult.error.message);

    const total = countResult.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Data query
    let dataQuery = supabaseAdmin
      .from<{ id: string; label: string | null; address: string; chain: string; risk_score: number; scanned_at: string }>("wallet_scans")
      .select("id, label, address, chain, risk_score, scanned_at")
      .eq("user_id", userId)
      .order(sortColumn, { ascending })
      .range(offset, offset + limit - 1);
    if (chain) dataQuery = dataQuery.eq("chain", chain);

    const dataResult = await (dataQuery as unknown as Promise<{ data: { id: string; label: string | null; address: string; chain: string; risk_score: number; scanned_at: string }[] | null; error: { message: string } | null }>);
    if (dataResult.error) throw new Error(dataResult.error.message);

    return res.status(200).json({
      scans: dataResult.data ?? [],
      total,
      page,
      totalPages,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/history] Error:", msg);
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

  if (typeof label !== "string") {
    return res.status(400).json({ error: "label must be a string" });
  }

  const trimmedLabel = label.trim();

  if (trimmedLabel.length > 50) {
    return res.status(400).json({ error: "label must be 50 characters or fewer" });
  }

  try {
    // Verify ownership before update
    const { data: existing, error: findErr } = await supabaseAdmin
      .from<{ id: string }>("wallet_scans")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (findErr || !existing) {
      return res.status(404).json({ error: "Scan not found or access denied" });
    }

    // Apply update
    const updateResult = await (
      supabaseAdmin
        .from("wallet_scans")
        .update({ label: trimmedLabel || null })
        .eq("id", id)
        .eq("user_id", userId) as unknown as Promise<{ error: { message: string } | null }>
    );

    if (updateResult.error) throw new Error(updateResult.error.message);

    return res.status(200).json({ success: true, label: trimmedLabel || null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/history/:id/label] Error:", msg);
    return res.status(500).json({ error: "Failed to update label" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/history/export
// NOTE: registered before /:id patterns so "export" isn't treated as a scan ID
// ════════════════════════════════════════════════════════════════════════════
historyRouter.get("/export", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const chain = (req.query.chain as string | undefined) || undefined;

  try {
    let query = supabaseAdmin
      .from<{ label: string | null; address: string; chain: string; risk_score: number; scanned_at: string }>("wallet_scans")
      .select("label, address, chain, risk_score, scanned_at")
      .eq("user_id", userId)
      .order("scanned_at", { ascending: false });
    if (chain) query = query.eq("chain", chain);

    const result = await (query as unknown as Promise<{ data: { label: string | null; address: string; chain: string; risk_score: number; scanned_at: string }[] | null; error: { message: string } | null }>);
    if (result.error) throw new Error(result.error.message);

    const header = "Label,Address,Chain,Score,Risk,Date";
    const rows = (result.data ?? []).map((scan) => {
      const labelVal =
        scan.label && scan.label.trim()
          ? scan.label.trim()
          : scan.address.slice(0, 8);

      const score = scan.risk_score ?? 0;
      const risk = scoreToRisk(score);
      const date = formatDate(scan.scanned_at);

      const escape = (val: string) =>
        val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"`
          : val;

      return [
        escape(labelVal),
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/history/export] Error:", msg);
    return res.status(500).json({ error: "Failed to export history" });
  }
});

export default historyRouter;
