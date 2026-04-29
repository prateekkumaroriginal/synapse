import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileText, CheckCircle2, PlayCircle, XCircle, Ban, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";

interface JobStatusPanelProps {
  ticketId: Id<"tickets">;
}

const statusColors: Record<string, string> = {
  queued: "bg-gray-200 text-gray-700 hover:bg-gray-300",
  running: "bg-blue-100 text-blue-800 animate-pulse hover:bg-blue-200",
  succeeded: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  failed: "bg-rose-100 text-rose-800 hover:bg-rose-200",
  cancelled: "bg-slate-100 text-slate-500 hover:bg-slate-200",
};

const statusIcons: Record<string, React.ReactNode> = {
  queued: <RotateCcw className="size-3 opacity-75" />,
  running: <PlayCircle className="size-3" />,
  succeeded: <CheckCircle2 className="size-3" />,
  failed: <XCircle className="size-3" />,
  cancelled: <Ban className="size-3" />,
};

const jobTypeLabels: Record<string, string> = {
  GENERATE_AC: "Acceptance Criteria Generation",
  GENERATE_PLAN: "Implementation Plan Generation",
  GENERATE_CODE: "Code Generation",
  VALIDATE: "Code Validation",
  FIX_AFTER_FAILURE: "Auto-Fix Attempt",
  CREATE_PR: "Create Pull Request",
};

export function JobStatusPanel({ ticketId }: JobStatusPanelProps) {
  const jobs = useQuery(api.jobs.listJobs, { ticketId });

  if (jobs === undefined) {
    return <JobStatusPanel.Skeleton />;
  }

  if (jobs.length === 0) {
    return (
      <Empty className="h-full overflow-hidden rounded-xl border-solid bg-card">
        <EmptyMedia variant="icon">
          <FileText className="size-6" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No Tasks Yet</EmptyTitle>
          <EmptyDescription>
            Advance the phase to trigger the first background workflow task.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col border rounded-xl bg-card overflow-hidden h-full">
      <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Background Processes</h3>
        <Badge variant="outline" className="text-xs font-normal">
          {jobs.length} Job{jobs.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {jobs.map((job) => (
          <div key={job._id} className="flex flex-col gap-2 border rounded-lg p-3 shadow-sm bg-background">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                {jobTypeLabels[job.type] || job.type}
              </span>
              <Badge className={cn("shrink-0", statusColors[job.status])} variant="secondary">
                {statusIcons[job.status]}
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Attempt: {job.attempt}</span>
              {job.startedAt && <span>{new Date(job.startedAt).toLocaleTimeString()}</span>}
            </div>

            {/* Error Accordion for Failed Jobs */}
            {job.status === "failed" && job.error && (
              <Accordion type="single" collapsible className="w-full border-t pt-1">
                <AccordionItem value={`error-${job._id}`} className="border-none">
                  <AccordionTrigger className="py-2 text-xs text-rose-600 hover:text-rose-700 hover:no-underline font-medium flex items-center">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      View Error Details
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-1 pt-1">
                    <Alert variant="destructive" className="flex flex-col gap-2">
                      <AlertTitle className="text-xs font-bold uppercase tracking-wider">Traceback Logs</AlertTitle>
                      <AlertDescription className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                        {job.error}
                      </AlertDescription>
                    </Alert>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {/* Optional Result preview */}
            {job.status === "succeeded" && job.result?.content && (
              <div className="text-xs border rounded p-2 bg-muted/30">
                <div className="flex gap-1 text-muted-foreground line-clamp-2">
                  <span className="font-semibold text-foreground">Output:</span>
                  {typeof job.result.content === 'string' ? job.result.content.substring(0, 50) + "..." : "Success payload generated"}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

JobStatusPanel.Skeleton = function JobStatusPanelSkeleton() {
  return (
    <div className="flex flex-col border rounded-xl bg-card overflow-hidden h-full animate-pulse">
      <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 border rounded-lg p-3 bg-background/50">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
