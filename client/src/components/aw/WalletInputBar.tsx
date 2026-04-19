// Wallet input bar: [Chain selector] [Address] [Scan Now] — pill shaped.
// - Dropdown shows all 6 chains with official chain logos
// - Click-outside dismiss, escape-to-close, z-index above everything
// - Beta badge inline for XRP / Sui
import { useEffect, useRef, useState } from "react";
import { CHAINS, ChainCode, CHAIN_MAP } from "@/lib/constants";
import { CHAIN_LOGOS } from "@/lib/chainLogos";
import { Button, Chip } from "./Primitives";
import { ChevronDown, Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

interface Props {
  defaultChain?: ChainCode;
  defaultAddress?: string;
  onSubmit: (address: string, chain: ChainCode) => void;
  autoFocus?: boolean;
  size?: "md" | "lg";
  ctaLabel?: string;
}

// Inline chain logo — uses official trustwallet/assets logos. Falls back to a
// colored dot if the remote image fails to load (e.g. sandbox offline).
export function ChainLogo({
  code,
  size = 20,
  className,
}: {
  code: ChainCode;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const info = CHAIN_MAP[code];
  if (errored) {
    return (
      <span
        className={cn("inline-block rounded-full", className)}
        style={{
          width: size,
          height: size,
          background: info.color,
        }}
        aria-hidden
      />
    );
  }
  return (
    <img
      src={CHAIN_LOGOS[code]}
      alt={`${info.name} logo`}
      width={size}
      height={size}
      onError={() => setErrored(true)}
      className={cn("rounded-full object-contain", className)}
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );
}

export function WalletInputBar({
  defaultChain = "ETH",
  defaultAddress = "",
  onSubmit,
  autoFocus,
  size = "lg",
  ctaLabel,
}: Props) {
  const t = useT();
  const [chain, setChain] = useState<ChainCode>(defaultChain);
  const [address, setAddress] = useState(defaultAddress);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleSubmit = () => {
    if (!address.trim()) return;
    onSubmit(address.trim(), chain);
  };

  const info = CHAIN_MAP[chain];
  const label = ctaLabel ?? t("common.scan_now");

  return (
    <div
      ref={rootRef}
      className={cn(
        "aw-wallet-bar relative flex items-center gap-2 rounded-full border transition-colors",
        "bg-[color:var(--bg-inset)] focus-within:border-[color:var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-ghost)]"
      )}
      style={{
        borderColor: "#1a1a1a",
        padding: size === "lg" ? 6 : 4,
        height: size === "lg" ? 60 : 48,
      }}
    >
      {/* Chain selector */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-full px-3 transition-colors shrink-0",
          "hover:bg-[#151515] text-white"
        )}
        style={{ height: size === "lg" ? 48 : 40 }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ChainLogo code={chain} size={18} />
        <span className="font-semibold text-sm tracking-tight">{info.code}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-[color:var(--fg-tertiary)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <div className="w-px h-7 bg-[#1a1a1a] shrink-0" aria-hidden />

      <div className="flex-1 flex items-center px-3 min-w-0 self-stretch">
        <Search className="w-4 h-4 text-[color:var(--fg-tertiary)] shrink-0 mr-2" />
        <input
          autoFocus={autoFocus}
          className="flex-1 min-w-0 bg-transparent outline-none mono text-[14px] text-white placeholder:text-[color:var(--fg-tertiary)]"
          placeholder={info.placeholder}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
      </div>

      <Button
        variant="primary"
        size={size === "lg" ? "md" : "sm"}
        onClick={handleSubmit}
        disabled={!address.trim()}
        trailingIcon={ArrowRight}
        className="aw-wallet-bar-cta shrink-0 self-center"
      >
        {label}
      </Button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[260px] rounded-2xl border p-1.5 aw-fade-in"
          style={{
            background: "#111",
            borderColor: "#1a1a1a",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          }}
        >
          {CHAINS.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setChain(c.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                chain === c.code ? "bg-[#151515]" : "hover:bg-[#151515]"
              )}
              role="option"
              aria-selected={chain === c.code}
            >
              <ChainLogo code={c.code} size={20} />
              <span className="text-white text-[13px] font-medium">{c.name}</span>
              <span className="text-[11px] text-[color:var(--fg-tertiary)] mono">
                {c.code}
              </span>
              {c.beta && (
                <Chip tone="beta" className="ml-auto">
                  {t("common.beta")}
                </Chip>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
