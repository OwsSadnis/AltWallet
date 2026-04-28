import { useAuth } from "@clerk/clerk-react";
import { Redirect, useLocation } from "wouter";
import type { PropsWithChildren } from "react";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isSignedIn, isLoaded } = useAuth();
  const [currentPath] = useLocation();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#1D9E75", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to={"/sign-in?redirect=" + encodeURIComponent(currentPath)} />;
  }

  return <>{children}</>;
}
