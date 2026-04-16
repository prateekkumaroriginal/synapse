import { Outlet } from "react-router-dom";

import { AppHeader } from "@/components/layout/AppHeader";

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <AppHeader />
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
