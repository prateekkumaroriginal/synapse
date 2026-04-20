import { Link } from "react-router-dom";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ProjectCardProps = {
  project: Doc<"projects">;
  ownerInitials: string;
};

export function ProjectCard({ project, ownerInitials }: ProjectCardProps) {
  return (
    <Link
      to={`/projects/${project._id}`}
      className="block rounded-2xl text-left no-underline outline-none ring-offset-background focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Card className="flex h-28 min-h-0 flex-col gap-0 rounded-2xl border-border py-4 transition-shadow hover:shadow-md">
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-6">
          <div className="flex min-w-0 shrink-0 items-center justify-between gap-3">
            <CardTitle className="min-w-0 flex-1 text-lg leading-snug text-foreground">
              {project.name}
            </CardTitle>
            <Avatar className="size-9 shrink-0 ring-2 ring-border">
              <AvatarFallback className="bg-secondary text-xs font-medium text-secondary-foreground">
                {ownerInitials}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-h-0 flex-1">
            {project.description ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardDescription className="line-clamp-2 cursor-default break-words text-left text-xs leading-snug text-muted-foreground">
                    {project.description}
                  </CardDescription>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  {project.description}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}

ProjectCard.Skeleton = function ProjectCardSkeleton() {
  return (
    <Card className="flex h-28 min-h-0 flex-col gap-0 rounded-2xl border-border py-4">
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-6">
        <div className="flex min-w-0 shrink-0 items-center justify-between gap-3">
          <Skeleton className="h-6 max-w-[min(100%,14rem)] flex-1 rounded-md" />
          <Skeleton className="size-9 shrink-0 rounded-full" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-full max-w-[90%] rounded-md" />
          <Skeleton className="h-3 w-4/5 max-w-[75%] rounded-md" />
        </div>
      </div>
    </Card>
  );
};
