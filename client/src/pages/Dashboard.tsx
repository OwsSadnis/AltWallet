// Dashboard preview — static demo with scan history table
import { Card, Chip, Eyebrow, Button, IconBtn } from "@/components/aw/Primitives";
import { Reveal, CountUp } from "@/components/aw/motion";
import { ChainBadge } from "@/components/aw/ResultCards";
import { CHAINS, ChainCode, riskFromScore, generateScan } from "@/lib/constants";
import { Download, RotateCw, ExternalLink, Lock } from "lucide-react";
import { useLocation } from "wouter";

const DEMO_HISTORY = [
  { addr: "0x7a3f4b2cde918f2c88f09a7b4ce4e91c", chain: "ETH" as ChainCode, date: "Today · 14:22" },
  { addr: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx", chain: "BTC" as ChainCode, date: "Today · 09:48" },
  { addr: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLV", chain: "SOL" as ChainCode, date: "Yesterday" },
  { addr: "rLNaPoKeeBjZe2qs6x52yVPZpZ8td4dc6w", chain: "XRP" as ChainCode, date: "Apr 14" },
  { addr: "TNPeeaaFB7K9cmo4uQpcU32zGK8G1NYqeL", chain: "TRX" as ChainCode, date: "Apr 13" },
  { addr: "0xdee9e5b0e5c5e3c2c3e7a9d1b2c3d4e5f6a7b8", chain: "SUI" as ChainCode, date: "Apr 11" },
];

export default function Dashboard() {
  const [, navigate] = useLocation();

  return (
    <div className="container" style={{ paddingTop: 64, paddingBottom: 120 }}>
      <Reveal>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <Eyebrow>Dashboard</Eyebrow>
            <h1 className="text-white text-[32px] font-bold tracking-tight mt-2">
              Welcome back, Sasha
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Chip tone="neutral">Free plan</Chip>
              <span className="text-[12px] text-[color:var(--fg-tertiary)]">
                Upgrade to unlock unlimited scans and PDF reports
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              icon={Download}
              disabled
              title="Business plan required"
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate("/pricing")}
            >
              Upgrade
            </Button>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Checks today" value="1 / 1" hint="Free tier limit" />
          <StatCard label="Checks this month" value="34" hint="+12 vs last month" accent />
          <StatCard label="Current plan" value="Free" hint="Upgrade available" />
        </div>
      </Reveal>

      <Reveal>
        <Card className="aw-table-card">
          <div className="aw-card-head">
            <Eyebrow>Recent scans</Eyebrow>
            <div className="aw-card-actions">
              <IconBtn icon={RotateCw} aria-label="Refresh" />
            </div>
          </div>
          <div className="aw-tbl">
            <div className="aw-tbl-head">
              <div>Wallet</div>
              <div className="aw-tbl-hide-sm">Chain</div>
              <div>Score</div>
              <div className="aw-tbl-hide-sm">Date</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>
            {DEMO_HISTORY.map((row) => {
              const scan = generateScan(row.addr, row.chain);
              const risk = riskFromScore(scan.score);
              return (
                <div key={row.addr} className="aw-tbl-row">
                  <div className="mono aw-addr truncate">
                    {row.addr.slice(0, 10)}…{row.addr.slice(-6)}
                  </div>
                  <div className="aw-tbl-hide-sm">
                    <ChainBadge chain={row.chain} />
                  </div>
                  <div>
                    <Chip tone={risk.tone} dot>
                      {scan.score} · {risk.label}
                    </Chip>
                  </div>
                  <div className="aw-tbl-hide-sm aw-tbl-time">{row.date}</div>
                  <div
                    className="flex items-center justify-end gap-1"
                    style={{ textAlign: "right" }}
                  >
                    <IconBtn
                      icon={ExternalLink}
                      aria-label="View"
                      onClick={() =>
                        navigate(
                          `/checker?address=${encodeURIComponent(
                            row.addr
                          )}&chain=${row.chain}`
                        )
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </Reveal>

      <Reveal>
        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <Card hover>
            <div className="aw-card-head">
              <Eyebrow>Account settings</Eyebrow>
            </div>
            <div className="flex flex-col gap-3">
              <Row label="Email" value="sasha@altwallet.id" />
              <Row label="Language" value="English" />
              <Row label="Member since" value="Jan 2026" />
              <Row label="Seats" value="1" />
            </div>
          </Card>
          <Card hover>
            <div className="aw-card-head">
              <Eyebrow>Chain coverage</Eyebrow>
              <span className="aw-meta">{CHAINS.length} chains</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {CHAINS.map((c) => (
                <div
                  key={c.code}
                  className="rounded-lg border p-3 flex items-center gap-2"
                  style={{ borderColor: "#1a1a1a", background: "#0E0E0E" }}
                >
                  <span
                    className="aw-chain-dot"
                    style={{ background: c.color }}
                    aria-hidden
                  />
                  <span className="text-white text-[13px] font-medium">
                    {c.code}
                  </span>
                  {c.beta && (
                    <Chip tone="beta" className="ml-auto">
                      Beta
                    </Chip>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Reveal>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  // extract numeric if possible for count-up effect
  const num = parseInt(value.replace(/[^0-9]/g, ""), 10);
  return (
    <Card hover>
      <Eyebrow>{label}</Eyebrow>
      <div
        className="text-white font-bold mt-3 tracking-tight mono"
        style={{ fontSize: 36, color: accent ? "var(--accent)" : undefined }}
      >
        {Number.isFinite(num) && value.length < 10 ? <CountUp to={num} /> : value}
      </div>
      {hint && (
        <div className="text-[12px] text-[color:var(--fg-tertiary)] mt-2 flex items-center gap-1.5">
          {accent ? null : <Lock className="w-3 h-3" />}
          {hint}
        </div>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-t" style={{ borderColor: "#1a1a1a" }}>
      <span className="text-[12px] text-[color:var(--fg-tertiary)]">{label}</span>
      <span className="text-[13px] text-white">{value}</span>
    </div>
  );
}
