import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { sendTokenEmail } from "../../lib/resend.js";
import { randomBytes } from "crypto";

const router = Router();
router.use(requireAdmin);

function generateToken(): string {
  const bytes = randomBytes(14);
  const hex = bytes.toString("hex").toUpperCase();
  return `ALTW-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

/**
 * POST /api/admin/tokens/generate
 * Generate a new access token and optionally email it
 *
 * Body: mode, plan, email?, note?, expires_days?
 */
router.post("/generate", async (req: Request, res: Response): Promise<void> => {
  const { mode, plan, email, note, expires_days } = req.body;
  const adminUserId = (req as any).adminUserId;

  if (!mode || !["beta_tester", "special_package"].includes(mode)) {
    res.status(400).json({
      error: "Invalid mode. Must be 'beta_tester' or 'special_package'",
    });
    return;
  }

  if (!plan || !["pro", "business"].includes(plan)) {
    res.status(400).json({
      error: "Invalid plan. Must be 'pro' or 'business'",
    });
    return;
  }

  try {
    const token = generateToken();
    const expiryDays = typeof expires_days === "number" ? expires_days : 365;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const { data: tokenRecord, error: insertError } = await supabaseAdmin
      .from("tokens")
      .insert({
        token,
        plan,
        mode,
        email: email || null,
        note: note || null,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_by: adminUserId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("[POST /admin/tokens/generate] Insert error:", insertError);
      res.status(500).json({ error: "Failed to create token" });
      return;
    }

    let emailSent = false;
    if (email) {
      try {
        await sendTokenEmail({ email, token, plan, mode });
        emailSent = true;
      } catch (emailErr) {
        console.error("[POST /admin/tokens/generate] Email error:", emailErr);
      }
    }

    res.status(201).json({ success: true, token: tokenRecord, email_sent: emailSent });
  } catch (err) {
    console.error("[POST /admin/tokens/generate] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/admin/tokens
 * List all tokens with pagination and filters
 *
 * Query: page, limit, status (used|unused|expired), mode, plan
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const mode = req.query.mode as string;
    const plan = req.query.plan as string;

    let query = supabaseAdmin
      .from("tokens")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === "used") {
      query = query.eq("used", true);
    } else if (status === "unused") {
      query = query.eq("used", false).gt("expires_at", new Date().toISOString());
    } else if (status === "expired") {
      query = query.eq("used", false).lt("expires_at", new Date().toISOString());
    }

    if (mode) query = query.eq("mode", mode);
    if (plan) query = query.eq("plan", plan);

    const { data: tokens, error, count } = await query;

    if (error) {
      console.error("[GET /admin/tokens] Supabase error:", error);
      res.status(500).json({ error: "Failed to fetch tokens" });
      return;
    }

    const annotated = (tokens ?? []).map((t: Record<string, any>) => ({
      ...t,
      computed_status: t.used
        ? "used"
        : new Date(t.expires_at) < new Date()
        ? "expired"
        : "unused",
    }));

    res.json({
      data: annotated,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (err) {
    console.error("[GET /admin/tokens] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
