import { useConvexAuth } from "convex/react";
import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
    );
  }

  return children;
}
