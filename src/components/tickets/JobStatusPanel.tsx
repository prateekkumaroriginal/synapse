import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileText, CheckCircle2, PlayCircle, Loader2, XCircle, Ban, RotateCcw } from "lucide-react";

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
  queued: <RotateCcw className="w-3 h-3 opacity-75" />,
  running: <PlayCircle className="w-3 h-3" />,
  succeeded: <CheckCircle2 className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
  cancelled: <Ban className="w-3 h-3" />,
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
    return (
      <div className="w-full h-full p-4 flex flex-col items-center justify-center gap-3 border rounded-xl bg-card/50">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Loading job history...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center gap-3 border rounded-xl bg-card">
        <div className="bg-muted p-3 rounded-full">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1 items-center">
          <h3 className="font-medium text-foreground">No Tasks Yet</h3>
          <p className="text-sm text-muted-foreground max-w-[200px]">
            Advance the phase to trigger the first background workflow task.
          </p>
        </div>
      </div>
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
              <Badge className={`shrink-0 ${statusColors[job.status]}`} variant="secondary">
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
                      <AlertCircle className="w-3 h-3" />
                      View Error Details
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-1 pt-1">
                    <Alert variant="destructive" className="bg-rose-50/50 flex flex-col gap-2">
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
