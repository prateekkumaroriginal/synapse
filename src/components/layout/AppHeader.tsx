import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsFromViewer } from "@/lib/viewer-display";

export function AppHeader() {
  const viewer = useQuery(api.users.getViewerProfile, {});
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  const email = viewer?.email ?? null;
  const name = viewer?.name ?? null;
  const initials = initialsFromViewer(email, name);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Synapse
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Open account menu"
                aria-haspopup="menu"
              >
                <Avatar className="size-9 ring-2 ring-border">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                    {viewer === undefined ? "…" : initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52 rounded-xl">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Signed in</span>
                  <span className="truncate text-sm text-foreground">
                    {email ?? "—"}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg text-destructive focus:text-destructive"
                onSelect={() => {
                  void signOut().then(() => navigate("/sign-in", { replace: true }));
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
