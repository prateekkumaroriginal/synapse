import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  TICKET_STATUS_LABELS,
  nextStatus,
  prevStatus,
} from "../../../convex/ticketWorkflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  const canPrev = prevStatus(status) !== null;
  const canNext = nextStatus(status) !== null;
  const busy = movingTicketId === ticket._id;

  return (
    <Card className="rounded-2xl border-border">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium",
                ticket.type === "BUG"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {ticket.type === "BUG" ? "Bug" : "Task"}
            </span>
            <span className="text-xs text-muted-foreground">
              {TICKET_STATUS_LABELS[status]}
            </span>
          </div>
          <p className="font-medium leading-snug">{ticket.title}</p>
          {ticket.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {ticket.description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!canPrev || busy}
            aria-label="Move ticket back one stage"
            onClick={() => {
              onMovePrev(ticket._id);
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!canNext || busy}
            aria-label="Move ticket forward one stage"
            onClick={() => {
              onMoveNext(ticket._id);
            }}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

TicketRow.Skeleton = function TicketRowSkeleton() {
  return (
    <Card className="rounded-2xl border-border">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
          <Skeleton className="h-5 max-w-md rounded-md" />
          <Skeleton className="h-4 w-full max-w-lg rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
};
