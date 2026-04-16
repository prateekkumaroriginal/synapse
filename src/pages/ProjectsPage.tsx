import { useQuery } from "convex/react";
import { FolderOpen, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { initialsFromViewer } from "@/lib/viewer-display";

type ProjectDoc = Doc<"projects">;

type ProjectsQueryState =
  | { status: "loading" }
  | { status: "ready"; projects: ProjectDoc[] };

export default function ProjectsPage() {
  const raw = useQuery(api.projects.listMyProjects, {});
  const viewer = useQuery(api.users.getViewerProfile, {});
  const listState: ProjectsQueryState =
    raw === undefined ? { status: "loading" } : { status: "ready", projects: raw };

  const ownerInitials =
    viewer === undefined
      ? "…"
      : initialsFromViewer(viewer?.email ?? null, viewer?.name ?? null);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your projects</h1>
        </div>
        <Button type="button" className="shrink-0 self-start sm:self-auto" asChild>
          <Link to="/projects/new">
            <Plus className="size-4" />
            New project
          </Link>
        </Button>
      </div>

      {listState.status === "loading" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <ProjectCard.Skeleton key={index} />
          ))}
        </div>
      ) : listState.projects.length === 0 ? (
        <Empty className="min-h-64 rounded-2xl bg-card/30 md:min-h-80">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpen className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create your first project to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/projects/new">
                <Plus className="size-4" />
                New project
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {listState.projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              ownerInitials={ownerInitials}
            />
          ))}
        </div>
      )}
    </div>
  );
}
