import { Router, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

const flaggedRouter = Router();

function getUserId(req: Request): string | null {
  const { userId } = getAuth(req);
  return userId ?? null;
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/flagged
// ════════════════════════════════════════════════════════════════════════════
flaggedRouter.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await (
      supabaseAdmin
        .from<{
          id: string;
          address: string;
          chain: string;
          score: number;
          label: string | null;
          created_at: string;
        }>("wallet_scans")
        .select("id, address, chain, score, label, created_at")
        .eq("user_id", userId)
        .lte("score", 39)
        .order("created_at", { ascending: false }) as unknown as Promise<{
          data: {
            id: string;
            address: string;
            chain: string;
            score: number;
            label: string | null;
            created_at: string;
          }[] | null;
          error: { message: string } | null;
        }>
    );

    if (result.error) throw new Error(result.error.message);

    const wallets = (result.data ?? []).map((row) => ({
      id: row.id,
      address: row.address,
      chain: row.chain,
      score: row.score,
      label: row.label,
      scannedAt: row.created_at,
    }));

    return res.status(200).json({ wallets });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/flagged] Error:", msg);
    return res.status(500).json({ error: "Failed to fetch flagged wallets" });
  }
});

export default flaggedRouter;
