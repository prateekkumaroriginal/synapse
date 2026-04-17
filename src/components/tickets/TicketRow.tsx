import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  TICKET_STATUS_LABELS,
  nextStatus,
  prevStatus,
} from "../../../convex/ticketWorkflow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type TicketRowProps = {
  ticket: Doc<"tickets">;
  onMoveNext: (ticketId: Id<"tickets">) => void;
  onMovePrev: (ticketId: Id<"tickets">) => void;
  movingTicketId: Id<"tickets"> | null;
};

export function TicketRow({
  ticket,
  onMoveNext,
  onMovePrev,
  movingTicketId,
}: TicketRowProps) {
  const status = ticket.status;
  const prev = prevStatus(status);
  const next = nextStatus(status);
  const canPrev = prev !== null;
  const canNext = next !== null;
  const busy = movingTicketId === ticket._id;

  const dateStr = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(ticket._creationTime);

  return (
    <div className="group col-span-full grid grid-cols-subgrid items-center border-b border-border bg-background px-4 py-3 transition-colors hover:bg-muted/40 last:border-b-0">
      <div className="min-w-0 pr-4">
        <p className="font-medium text-primary line-clamp-1">{ticket.title}</p>
        {ticket.description ? (
          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="line-clamp-1 text-xs text-muted-foreground mt-0.5">
                  {ticket.description}
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-sm">{ticket.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      <div>
        <Badge variant={ticket.type === "BUG" ? "destructive" : "secondary"}>
          {ticket.type === "BUG" ? "Bug" : "Task"}
        </Badge>
      </div>
      <div className="text-sm">
        {TICKET_STATUS_LABELS[status]}
      </div>
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {dateStr}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1 opacity-100 focus-within:opacity-100 transition-opacity md:opacity-0 md:group-[&:hover]:opacity-100">
        <TooltipProvider delayDuration={0}>
          {canPrev ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="default"
                  size="icon-sm"
                  disabled={busy}
                  aria-label="Move ticket back one stage"
                  onClick={() => onMovePrev(ticket._id)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Move to {prev ? TICKET_STATUS_LABELS[prev] : ""}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              type="button"
              variant="default"
              size="icon-sm"
              disabled
              aria-label="Cannot move ticket back"
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}

          {canNext ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="default"
                  size="icon-sm"
                  disabled={busy}
                  aria-label="Move ticket forward one stage"
                  onClick={() => onMoveNext(ticket._id)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Move to {next ? TICKET_STATUS_LABELS[next] : ""}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              type="button"
              variant="default"
              size="icon-sm"
              disabled
              aria-label="Cannot move ticket forward"
            >
              <ChevronRight className="size-4" />
            </Button>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}

TicketRow.Skeleton = function TicketRowSkeleton() {
  return (
    <div className="col-span-full grid grid-cols-subgrid border-b border-border bg-background px-4 py-3 items-center last:border-b-0">
      <div className="pr-4 space-y-2">
        <Skeleton className="h-5 w-3/4 max-w-sm rounded-md" />
        <Skeleton className="h-4 w-1/2 max-w-xs rounded-md" />
      </div>
      <div><Skeleton className="h-5 w-14 rounded-full" /></div>
      <div><Skeleton className="h-5 w-20 rounded-md" /></div>
      <div><Skeleton className="h-5 w-24 rounded-md" /></div>
      <div className="flex justify-end gap-1">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
    </div>
  );
};
