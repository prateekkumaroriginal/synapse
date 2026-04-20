import { useQuery } from "convex/react";
import { ArrowLeft, ArchiveX } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { initialsFromViewer } from "@/lib/viewer-display";

export default function ArchivedProjectsPage() {
  const projects = useQuery(api.projects.listArchivedProjects, {});
  const viewer = useQuery(api.users.getViewerProfile, {});

  const ownerInitials =
    viewer === undefined
      ? "…"
      : initialsFromViewer(viewer?.email ?? null, viewer?.name ?? null);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link to="/">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">Archived projects</h1>
        </div>
      </div>

      {projects === undefined ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <ProjectCard.Skeleton key={index} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Empty className="min-h-64 rounded-2xl md:min-h-80">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ArchiveX className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No archived projects</EmptyTitle>
            <EmptyDescription>
              Projects you archive will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
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
