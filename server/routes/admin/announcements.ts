import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";

const router = Router();
router.use(requireAdmin);

const VALID_TARGETS = ["all", "free", "pro", "business"] as const;
type AnnouncementTarget = (typeof VALID_TARGETS)[number];

/**
 * GET /api/admin/announcements
 * List all announcements, newest first
 *
 * Query: page, limit, target
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const target = req.query.target as string;

    let query = supabaseAdmin
      .from("announcements")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (target && VALID_TARGETS.includes(target as AnnouncementTarget)) {
      query = query.eq("target", target);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[GET /admin/announcements] Supabase error:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
      return;
    }

    res.json({
      data: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (err) {
    console.error("[GET /admin/announcements] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/admin/announcements
 * Publish a new announcement
 *
 * Body: title, message, target, type?, expires_at?
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const adminUserId = (req as any).adminUserId;
  const { title, message, target, type, expires_at } = req.body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  if (title.trim().length > 120) {
    res.status(400).json({ error: "title must be 120 characters or less" });
    return;
  }
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  if (message.trim().length > 1000) {
    res.status(400).json({ error: "message must be 1000 characters or less" });
    return;
  }
  if (!target || !VALID_TARGETS.includes(target as AnnouncementTarget)) {
    res.status(400).json({ error: `target must be one of: ${VALID_TARGETS.join(", ")}` });
    return;
  }

  const validTypes = ["info", "warning", "success"];
  const announcementType = type && validTypes.includes(type) ? type : "info";

  let expiresAt: string | null = null;
  if (expires_at) {
    const parsed = new Date(expires_at);
    if (isNaN(parsed.getTime())) {
      res.status(400).json({ error: "Invalid expires_at date format" });
      return;
    }
    if (parsed <= new Date()) {
      res.status(400).json({ error: "expires_at must be in the future" });
      return;
    }
    expiresAt = parsed.toISOString();
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("announcements")
      .insert({
        title: title.trim(),
        message: message.trim(),
        target,
        type: announcementType,
        expires_at: expiresAt,
        created_by: adminUserId,
        created_at: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /admin/announcements] Supabase error:", error);
      res.status(500).json({ error: "Failed to create announcement" });
      return;
    }

    res.status(201).json({ success: true, announcement: data });
  } catch (err) {
    console.error("[POST /admin/announcements] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/admin/announcements/:id/deactivate
 * Soft-delete: mark announcement inactive
 */
router.patch("/:id/deactivate", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from("announcements")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      res.status(500).json({ error: "Failed to deactivate announcement" });
      return;
    }

    res.json({ success: true, message: "Announcement deactivated" });
  } catch (err) {
    console.error("[PATCH /admin/announcements/:id/deactivate] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
