// AltWallet wordmark — uses the provided LogoAltWallet.png exactly as-is.
// Navbar logo height is controlled by the global `.aw-nav-logo-img` rule
// (32px desktop / 26px mobile / 24px on <380px).
import { LOGO_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={LOGO_URL}
      alt="AltWallet by AltNeurealms"
      className={cn("aw-nav-logo-img", className)}
      draggable={false}
    />
  );
}

// Full raster logo — larger splash surfaces (Redeem, 404, etc).
export function LogoImage({
  height = 64,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <img
      src={LOGO_URL}
      alt="AltWallet"
      className={cn("aw-logo-image", className)}
      style={{ height, width: "auto" }}
      draggable={false}
    />
  );
}
