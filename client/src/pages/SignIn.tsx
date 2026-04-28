import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get("redirect") || "/dashboard";

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <SignIn
        routing="hash"
        signUpUrl="/sign-in#/sign-up"
        fallbackRedirectUrl={redirectTo}
        appearance={{
          variables: {
            colorPrimary: "#1D9E75",
            colorBackground: "#0f0f0f",
            colorText: "#ffffff",
            colorInputBackground: "#1a1a1a",
            colorInputText: "#ffffff",
          },
        }}
      />
    </div>
  );
}
