// Flagged counterparty drill-in — adapted from FlaggedDetail.jsx to use
// the AltWallet red/yellow/green flag taxonomy (not just "Critical").
import { Card, Chip, Eyebrow, Button } from "@/components/aw/Primitives";
import { ArrowLeft, ShieldX, Flag, ExternalLink } from "lucide-react";
import { Reveal } from "@/components/aw/motion";
import { useLocation } from "wouter";

export default function Flagged() {
  const [, navigate] = useLocation();
  const address = "0xf02a8c17b4de2a91f78df88a4de2a91f78d81dd";

  return (
    <div className="container" style={{ paddingTop: 64, paddingBottom: 120 }}>
      <div className="aw-flagged">
        <Reveal>
          <div className="aw-flagged-head">
            <button className="aw-back" onClick={() => navigate("/checker")}>
              <ArrowLeft /> Back to scan
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <Chip tone="high" dot>
                Red flag
              </Chip>
              <Chip tone="beta">Ethereum</Chip>
            </div>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <Eyebrow>Counterparty detail</Eyebrow>
          <h1 className="aw-flagged-title">Unverified contract</h1>
          <div
            className="aw-flagged-addr mono"
            style={{ color: "var(--risk-high)" }}
          >
            {address}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="aw-flagged-grid">
            <Card hover>
              <Eyebrow>Why it's flagged</Eyebrow>
              <ul className="aw-reasons">
                <li>
                  <span className="aw-dot-crit" />
                  Contract source is not verified on Etherscan. We cannot
                  audit its logic from the outside.
                </li>
                <li>
                  <span className="aw-dot-high" />
                  Deployed 3 days ago by an address with no prior on-chain
                  history — a common pattern for short-lived drainer contracts.
                </li>
                <li>
                  <span className="aw-dot-med" />
                  Has received rapid withdrawals from 4 different wallets in
                  the last 48 hours, then re-routed funds to a new address.
                </li>
                <li>
                  <span className="aw-dot-safe" />
                  No direct sanctions list match, and no known mixer counterparty yet.
                </li>
              </ul>
            </Card>
            <Card hover>
              <Eyebrow>Exposure</Eyebrow>
              <div className="aw-expose">
                <div className="aw-expose-num mono">$3,102.70</div>
                <div className="aw-expose-lbl">
                  Total value transferred to this address
                </div>
              </div>
              <div className="aw-expose-row">
                <span>Last interaction</span>
                <span className="mono">1 day ago</span>
              </div>
              <div className="aw-expose-row">
                <span>Active approvals</span>
                <span className="mono" style={{ color: "var(--risk-high)" }}>
                  2
                </span>
              </div>
              <div className="aw-expose-row">
                <span>Unique counterparties</span>
                <span className="mono">7</span>
              </div>
              <div className="aw-expose-row">
                <span>Deployed</span>
                <span className="mono">3 days ago</span>
              </div>
            </Card>
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className="aw-flagged-actions">
            <Button variant="primary" icon={ShieldX}>
              Revoke approvals
            </Button>
            <Button variant="secondary" icon={Flag}>
              Flag as malicious
            </Button>
            <Button
              variant="ghost"
              icon={ExternalLink}
              onClick={() =>
                window.open(`https://etherscan.io/address/${address}`, "_blank")
              }
            >
              View on Etherscan
            </Button>
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div
            className="aw-banner mt-10"
            style={{ background: "#0E0E0E" }}
          >
            <div className="aw-banner-icon" style={{ background: "rgba(229,72,77,0.12)", color: "#E5484D" }}>
              <ShieldX className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white">How this works:</strong>{" "}
              Revoking approvals removes a contract's permission to move tokens
              on your behalf. Always use your own wallet interface — AltWallet
              never signs or executes transactions for you.
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
