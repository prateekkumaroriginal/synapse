import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { Archive, Settings } from "lucide-react";

export function AppHeader() {
  const viewer = useQuery(api.users.getViewerProfile, {});
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();

  const isNewProject = location.pathname === "/projects/new";
  const isArchivedProjects = location.pathname === "/projects/archived";
  const isProjectWorkspace = location.pathname.startsWith("/projects/") && !isNewProject && !isArchivedProjects;
  const isSettingsPage = location.pathname.endsWith("/settings");
  
  const segments = location.pathname.split("/");
  const rawProjectId = isProjectWorkspace ? segments[2] : null;
  const projectId = rawProjectId ? (rawProjectId as Id<"projects">) : null;
  
  const project = useQuery(
    api.projects.getProject,
    projectId ? { projectId } : "skip"
  );

  const email = viewer?.email ?? null;
  const name = viewer?.name ?? null;
  const initials = initialsFromViewer(email, name);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/projects" className="text-lg font-semibold tracking-tight text-foreground hover:text-foreground">
                    Synapse
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {isNewProject && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>New project</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
              {isArchivedProjects && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="inline-flex items-center gap-1.5">
                      <Archive className="size-4" />
                      Archived
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
              {isProjectWorkspace && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isSettingsPage ? (
                      <BreadcrumbLink asChild>
                        <Link to={`/projects/${projectId}`}>{project ? project.name : "..."}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{project ? project.name : "..."}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {isSettingsPage && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="inline-flex items-center gap-1.5">
                          <Settings className="size-4" />
                          Settings
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
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
