import { SignIn } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { LogoImage } from "@/components/aw/Logo";

export default function SignInPage() {
  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get("redirect") || "/dashboard";

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ marginBottom: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <LogoImage height={240} />
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>by AltNeurealms</span>
      </div>
      <SignIn
        routing="hash"
        signUpUrl="/sign-in#/sign-up"
        fallbackRedirectUrl={redirectTo}
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: "#1D9E75",
            colorBackground: "#111111",
            colorText: "#ffffff",
            colorInputBackground: "#1a1a1a",
            colorInputText: "#ffffff",
          },
          elements: {
            socialButtonsBlockButton: {
              backgroundColor: "#1a1a1a",
              border: "1px solid #333333",
              color: "#ffffff",
            },
            socialButtonsBlockButtonText: {
              color: "#ffffff",
            },
          },
        }}
      />
    </div>
  );
}
