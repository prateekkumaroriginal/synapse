import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";

interface ValidationRunsPanelProps {
  ticketId: Id<"tickets">;
}

const statusStyles = {
  PASSED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  FAILED: "bg-rose-100 text-rose-800 hover:bg-rose-200",
  SKIPPED: "bg-slate-100 text-slate-600 hover:bg-slate-200",
};

function formatDuration(startedAt: number, finishedAt: number) {
  const durationMs = Math.max(0, finishedAt - startedAt);

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function ValidationRunsPanel({ ticketId }: ValidationRunsPanelProps) {
  const validationRuns = useQuery(api.validationRuns.listForTicket, { ticketId });

  if (validationRuns === undefined) {
    return <ValidationRunsPanel.Skeleton />;
  }

  if (validationRuns.length === 0) {
    return (
      <Empty className="min-h-60 overflow-hidden rounded-xl border-solid bg-card">
        <EmptyMedia variant="icon">
          <ClipboardCheck className="size-6" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No Validation Runs</EmptyTitle>
          <EmptyDescription>
            Code validation results will appear after generated code is checked.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex max-h-[420px] flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/50 px-4 py-3">
        <h3 className="text-sm font-semibold">Validation Runs</h3>
        <Badge variant="outline" className="text-xs font-normal">
          {validationRuns.length} Run{validationRuns.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {validationRuns.map((run) => (
          <Accordion
            key={run._id}
            type="single"
            collapsible
            className="rounded-lg border bg-background px-3"
          >
            <AccordionItem value={run._id} className="border-none">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
                  <div className="flex min-w-0 flex-col gap-1 text-left">
                    <span className="truncate text-sm font-medium">
                      {new Date(run.finishedAt).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(run.startedAt, run.finishedAt)}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn("shrink-0", statusStyles[run.overallStatus])}
                  >
                    {run.overallStatus === "PASSED" ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <XCircle className="size-3" />
                    )}
                    {run.overallStatus}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-3">
                {run.steps.map((step, index) => (
                  <div key={`${run._id}-${step.name}-${index}`} className="flex flex-col gap-2 rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="truncate text-sm font-medium">{step.name}</span>
                        {step.command && (
                          <code className="truncate text-xs text-muted-foreground">
                            {step.command}
                          </code>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn("shrink-0", statusStyles[step.status])}
                      >
                        {step.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(step.startedAt, step.finishedAt)}
                    </div>
                    {step.logExcerpt && (
                      <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                        {step.logExcerpt}
                      </pre>
                    )}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </div>
    </div>
  );
}

ValidationRunsPanel.Skeleton = function ValidationRunsPanelSkeleton() {
  return (
    <div className="flex max-h-[420px] flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        {[1, 2].map((item) => (
          <div key={item} className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
};
