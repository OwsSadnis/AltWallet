/**
 * Resend email helper using the REST API directly (no SDK package).
 * Consistent with the rest of the server which uses native fetch.
 */

interface SendTokenEmailParams {
  email: string;
  token: string;
  plan: "pro" | "business";
  mode: "beta_tester" | "special_package";
}

const PLAN_LABELS: Record<string, string> = {
  pro: "Pro",
  business: "Business",
};

const MODE_LABELS: Record<string, string> = {
  beta_tester: "Beta Tester",
  special_package: "Special Package",
};

export async function sendTokenEmail({
  email,
  token,
  plan,
  mode,
}: SendTokenEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");

  const planLabel = PLAN_LABELS[plan] ?? plan;
  const modeLabel = MODE_LABELS[mode] ?? mode;
  const redeemUrl = `https://altwallet.id/redeem`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .container { max-width: 520px; margin: 40px auto; padding: 40px 32px; background: #111; border-radius: 12px; border: 1px solid #222; }
    .logo { font-size: 20px; font-weight: 700; color: #1D9E75; margin-bottom: 32px; }
    h1 { font-size: 22px; font-weight: 600; color: #fff; margin: 0 0 12px; }
    p { color: #aaa; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .token-box { background: #0a0a0a; border: 1px solid #1D9E75; border-radius: 8px; padding: 16px 20px; margin: 24px 0; text-align: center; }
    .token { font-family: 'Courier New', monospace; font-size: 18px; font-weight: 700; color: #1D9E75; letter-spacing: 2px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 99px; background: #1D9E7520; color: #1D9E75; font-size: 12px; font-weight: 600; margin-bottom: 24px; border: 1px solid #1D9E7540; }
    .cta { display: block; width: 100%; text-align: center; padding: 14px; background: #1D9E75; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0 0; }
    .footer { color: #555; font-size: 12px; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">AltWallet</div>
    <span class="badge">${planLabel} — ${modeLabel}</span>
    <h1>Your Access Token is Ready</h1>
    <p>You've been granted <strong style="color:#fff">${planLabel}</strong> access to AltWallet. Use the token below to activate your account.</p>
    <div class="token-box">
      <div class="token">${token}</div>
    </div>
    <p style="font-size:13px; color:#666;">Token berlaku 1 tahun sejak dibuat. Gunakan sebelum expired.</p>
    <a href="${redeemUrl}" class="cta">Redeem Token →</a>
    <div class="footer">
      Kunjungi <a href="https://altwallet.id" style="color:#1D9E75">altwallet.id</a> · Kenali Dulu Siapa Mitra Anda.<br />
      Jangan bagikan token ini ke siapapun.
    </div>
  </div>
</body>
</html>`.trim();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AltWallet <noreply@altwallet.id>",
      to: [email],
      subject: `Your AltWallet ${planLabel} Access Token`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error ${res.status}: ${text}`);
  }
}
