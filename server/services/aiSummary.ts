/**
 * Claude Haiku AI summary generator.
 * Called after scan completes for Pro/Business users.
 * Model: claude-haiku-4-5-20251001
 */

const LANG_INSTRUCTION: Record<string, string> = {
  EN: "in English",
  ID: "dalam Bahasa Indonesia",
  AR: "باللغة العربية",
  ZH: "用简体中文",
};

export async function generateAiSummary(opts: {
  address: string;
  chain: string;
  score: number;
  redFlags: string[];
  yellowFlags: string[];
  greenSignals: string[];
  lang?: string;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[ai-summary] ANTHROPIC_API_KEY not set");
    return "";
  }

  const lang = opts.lang?.toUpperCase() ?? "EN";
  const langInstruction = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION.EN;

  const scoreLabel =
    opts.score >= 70 ? "safe" : opts.score >= 40 ? "medium risk" : "high risk";

  const prompt = [
    `You are a crypto wallet security analyst. A user just scanned wallet address ${opts.address} on the ${opts.chain} network.`,
    ``,
    `Scan results:`,
    `- Risk score: ${opts.score}/100 (${scoreLabel})`,
    `- Red flags (${opts.redFlags.length}): ${opts.redFlags.join("; ") || "none"}`,
    `- Yellow flags (${opts.yellowFlags.length}): ${opts.yellowFlags.join("; ") || "none"}`,
    `- Positive signals (${opts.greenSignals.length}): ${opts.greenSignals.join("; ") || "none"}`,
    ``,
    `Write a plain language summary ${langInstruction} for a crypto beginner. Maximum 150 words.`,
    `Cover: overall risk level, the most important finding, any positive signs, and a brief recommendation.`,
    `Write in flowing prose — no bullet points, no markdown, no headings.`,
    `End with a one-sentence disclaimer that this is one layer of due diligence, not a guarantee.`,
  ].join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    console.error("[ai-summary] Anthropic API error:", res.status);
    return "";
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text: string }>;
  };

  return data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
}
