import { useConvexAuth } from "convex/react";
import { type ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">
          {isLoading ? "Loading…" : "Redirecting…"}
        </p>
      </div>
    );
  }

  return children;
}
