const CHAIN_COLORS: Record<string, { fg: string; bg: string }> = {
  ETH: { fg: "#627eea", bg: "#1c2340" },
  SOL: { fg: "#9945ff", bg: "#1a1230" },
  TRX: { fg: "#ef0027", bg: "#2a0a0a" },
  BTC: { fg: "#f7931a", bg: "#2a1800" },
  XRP: { fg: "#00aae4", bg: "#0a1a2a" },
  SUI: { fg: "#4DA2FF", bg: "#0a1830" },
};

interface ChainLogoProps {
  chain: string;
  size?: number;
}

export default function ChainLogo({ chain, size = 28 }: ChainLogoProps) {
  const key = chain.toUpperCase();
  const color = CHAIN_COLORS[key] ?? { fg: "#888888", bg: "#1a1a1a" };
  return (
    <span
      className="aw-chainlogo"
      title={key}
      style={{
        width: size,
        height: size,
        background: color.bg,
        color: color.fg,
        fontSize: size <= 24 ? 8 : 9,
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        letterSpacing: "0.02em",
        userSelect: "none",
      }}
    >
      {key}
    </span>
  );
}
