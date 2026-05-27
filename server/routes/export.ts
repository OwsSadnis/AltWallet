/**
 * Export endpoints — Pro/Business only.
 *
 * GET /api/export/pdf?scanId=xxx   → PDF scan report
 * GET /api/export/csv              → CSV of user's scan history (windowed by plan)
 */

import { Router } from "express";
import { createRequire } from "module";
import { requireAuth, requirePaidPlan, getEffectivePlan } from "../middleware/auth.js";

export const exportRouter = Router();

// html-pdf-node is CommonJS; load via createRequire in ESM context
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const htmlPdfNode = require("html-pdf-node") as {
  generatePdf: (
    file: { content: string },
    options: { format?: string; printBackground?: boolean }
  ) => Promise<Buffer>;
};

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function fetchScanById(
  scanId: string,
  userId: string,
  cutoffDate: Date | null
): Promise<Record<string, unknown> | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  let endpoint = `${url}/rest/v1/wallet_scans?id=eq.${encodeURIComponent(scanId)}&user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`;
  if (cutoffDate) {
    endpoint += `&scanned_at=gte.${cutoffDate.toISOString()}`;
  }

  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}

async function fetchAllScans(
  userId: string,
  cutoffDate: Date | null
): Promise<Array<Record<string, unknown>>> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  let endpoint = `${url}/rest/v1/wallet_scans?user_id=eq.${encodeURIComponent(userId)}&order=scanned_at.desc&select=id,address,chain,risk_score,scanned_at`;
  if (cutoffDate) {
    endpoint += `&scanned_at=gte.${cutoffDate.toISOString()}`;
  }

  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return [];
  return (await res.json()) as Array<Record<string, unknown>>;
}

function getPlanCutoff(plan: string): Date | null {
  if (plan === "pro") {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
  if (plan === "business") {
    return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  }
  return null;
}

// ─── HTML report builder ──────────────────────────────────────────────────────
function buildPdfHtml(scan: Record<string, unknown>): string {
  const result = (scan.result as Record<string, unknown>) ?? {};
  const address = (scan.address as string) ?? "Unknown";
  const chain = (scan.chain as string) ?? "Unknown";
  const score = (scan.risk_score as number) ?? 0;
  const scannedAt = scan.scanned_at
    ? new Date(scan.scanned_at as string).toLocaleString("en-GB")
    : "Unknown";

  const scoreColor = score >= 70 ? "#1D9E75" : score >= 40 ? "#F5A623" : "#E53E3E";
  const scoreLabel = score >= 70 ? "Safe" : score >= 40 ? "Medium Risk" : "High Risk";

  type Flag = { id?: string; title?: string; detail?: string };
  const redFlags = ((result.redFlags as Flag[]) ?? []);
  const yellowFlags = ((result.yellowFlags as Flag[]) ?? []);
  const greenSignals = ((result.greenSignals as Flag[]) ?? []);
  const aiSummary = (result.aiSummary as string) ?? "";

  const flagRows = (flags: Flag[], color: string, label: string) =>
    flags.map(
      (f) => `<tr>
        <td style="color:${color};font-weight:600;padding:6px 12px;width:80px">${label}</td>
        <td style="padding:6px 12px;font-weight:600">${f.title ?? ""}</td>
        <td style="padding:6px 12px;color:#666;font-size:12px">${f.detail ?? ""}</td>
      </tr>`
    ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AltWallet Scan Report — ${address}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; color: #111; background: #fff; padding: 40px 48px; font-size: 14px; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none !important; }
  }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .brand { color: #1D9E75; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; margin-bottom: 24px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 32px; }
  .score-row { display: flex; align-items: center; gap: 24px; margin-bottom: 32px; }
  .score-big { font-size: 64px; font-weight: 800; line-height: 1; color: ${scoreColor}; }
  .score-info { display: flex; flex-direction: column; gap: 4px; }
  .score-label { font-size: 18px; font-weight: 700; color: ${scoreColor}; }
  .chain-badge { background: #f5f5f5; border-radius: 6px; padding: 2px 8px; font-family: monospace; font-size: 12px; }
  section { margin-bottom: 28px; }
  h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  tr:nth-child(even) td { background: #fafafa; }
  .ai-box { background: #f9f9f9; border-left: 3px solid #1D9E75; padding: 14px 16px; border-radius: 0 8px 8px 0; line-height: 1.7; color: #444; }
  .footer { margin-top: 48px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
</style>
</head>
<body>

<div class="brand">ALTWALLET SECURITY REPORT</div>

<h1>Wallet Scan Report</h1>
<div class="meta">
  Address: <code>${address}</code> &nbsp;·&nbsp;
  Chain: <span class="chain-badge">${chain}</span> &nbsp;·&nbsp;
  Scanned: ${scannedAt}
</div>

<div class="score-row">
  <div class="score-big">${score}</div>
  <div class="score-info">
    <div class="score-label">${scoreLabel}</div>
    <div style="color:#888;font-size:13px">out of 100 — higher is safer</div>
    <div style="color:#888;font-size:13px">${redFlags.length} red · ${yellowFlags.length} yellow · ${greenSignals.length} green</div>
  </div>
</div>

<section>
  <h2>Risk Flags &amp; Signals</h2>
  <table>
    ${flagRows(redFlags, "#E53E3E", "Red")}
    ${flagRows(yellowFlags, "#D97706", "Yellow")}
    ${flagRows(greenSignals, "#1D9E75", "Green")}
    ${redFlags.length + yellowFlags.length + greenSignals.length === 0
      ? '<tr><td colspan="3" style="padding:12px;color:#888">No risk findings detected.</td></tr>'
      : ""}
  </table>
</section>

${aiSummary ? `
<section>
  <h2>AI Analysis</h2>
  <div class="ai-box">${aiSummary}</div>
</section>
` : ""}

<div class="footer">
  Generated by AltWallet (altwallet.id) &nbsp;·&nbsp; ${scannedAt}<br>
  This report is one layer of due diligence — not a guarantee of safety. Always cross-check before moving significant value.
</div>
</body>
</html>`;
}

// ─── PDF endpoint ─────────────────────────────────────────────────────────────
exportRouter.get("/pdf", requireAuth, requirePaidPlan, async (req, res) => {
  const { scanId } = req.query as { scanId?: string };
  const userId = req.userId!;

  if (!scanId || typeof scanId !== "string") {
    return res.status(400).json({ error: "scanId is required." });
  }

  const plan = req.userPlan ?? (await getEffectivePlan(userId));
  const cutoff = getPlanCutoff(plan);

  const scan = await fetchScanById(scanId, userId, cutoff);
  if (!scan) {
    return res.status(404).json({ error: "Scan not found, access denied, or outside your plan's history window." });
  }

  const html = buildPdfHtml(scan);
  const address = (scan.address as string) ?? "wallet";
  const pdfFilename = `altwallet-${address.slice(0, 10)}-report.pdf`;

  try {
    const pdfBuffer = await htmlPdfNode.generatePdf(
      { content: html },
      { format: "A4", printBackground: true }
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${pdfFilename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("[export] pdf generation failed, falling back to HTML:", err);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${address.slice(0, 10)}-report.html"`);
    return res.send(html);
  }
});

// ─── CSV endpoint ─────────────────────────────────────────────────────────────
exportRouter.get("/csv", requireAuth, requirePaidPlan, async (req, res) => {
  const userId = req.userId!;
  const plan = req.userPlan ?? (await getEffectivePlan(userId));
  const cutoff = getPlanCutoff(plan);

  const scans = await fetchAllScans(userId, cutoff);

  const header = ["scan_id", "address", "chain", "risk_score", "scanned_at"].join(",");
  const rows = scans.map((s) =>
    [
      s.id ?? "",
      `"${s.address ?? ""}"`,
      s.chain ?? "",
      s.risk_score ?? "",
      s.scanned_at ?? "",
    ].join(",")
  );

  const csv = [header, ...rows].join("\r\n");
  const timestamp = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="altwallet-history-${timestamp}.csv"`);
  return res.send(csv);
});
