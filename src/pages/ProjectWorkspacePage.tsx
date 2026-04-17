import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { TICKET_STATUS_LABELS } from "../../convex/ticketWorkflow";
import { CreateTicketDialog } from "@/components/tickets/CreateTicketDialog";
import { TicketRow } from "@/components/tickets/TicketRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const rawProjectId = params.projectId ?? "";
  const projectId =
    rawProjectId.length > 0 ? (rawProjectId as Id<"projects">) : null;

  const project = useQuery(
    api.projects.getProject,
    projectId !== null ? { projectId } : "skip",
  );
  const tickets = useQuery(
    api.tickets.listForProject,
    projectId !== null ? { projectId } : "skip",
  );

  const moveTicket = useMutation(api.tickets.move);
  const [movingTicketId, setMovingTicketId] = useState<Id<"tickets"> | null>(
    null,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  async function handleMove(
    ticketId: Id<"tickets">,
    direction: "next" | "prev",
  ) {
    setMovingTicketId(ticketId);
    try {
      await moveTicket({ ticketId, direction });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not update ticket.";
      toast.error(message);
    } finally {
      setMovingTicketId(null);
    }
  }

  const filteredTickets = useMemo(() => {
    if (!tickets) return undefined;
    return tickets.filter((t) => {
      const matchesSearch = t.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchQuery, filterStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0 };
    Object.keys(TICKET_STATUS_LABELS).forEach((key) => {
      counts[key] = 0;
    });
    if (tickets) {
      tickets.forEach((t) => {
        counts.ALL++;
        counts[t.status] = (counts[t.status] || 0) + 1;
      });
    }
    return counts;
  }, [tickets]);

  if (projectId === null) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <p className="text-muted-foreground">Invalid project link.</p>
        <Button type="button" variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  if (project === undefined) {
    return <ProjectWorkspacePage.Skeleton />;
  }

  if (project === null) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <p className="text-muted-foreground">
          This project was not found or you do not have access.
        </p>
        <Button type="button" variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  const ticketsReady = filteredTickets !== undefined;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ms-2 mb-1 h-8 px-2 text-muted-foreground"
            asChild
          >
            <Link to="/">
              <ArrowLeft className="size-4" />
              Projects
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
          {project.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {project.description}
            </p>
          ) : null}
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CreateTicketDialog projectId={projectId} />
        </div>
      </div>

      <div className="flex flex-col gap-6 border rounded-2xl bg-card overflow-hidden">
        <div className="px-6 pt-6 flex overflow-x-auto pb-2">
          <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-full">
            <TabsList className="bg-transparent gap-2 h-auto p-0">
              <TabsTrigger 
                value="ALL" 
                className="data-[state=active]:bg-secondary data-[state=active]:shadow-none data-[state=active]:text-secondary-foreground gap-2 rounded-full px-4 py-2"
              >
                All
                <Badge variant="outline" className="bg-background text-muted-foreground px-1.5 py-0 min-w-5 justify-center">
                  {statusCounts.ALL}
                </Badge>
              </TabsTrigger>
              {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => (
                <TabsTrigger 
                  key={status} 
                  value={status} 
                  className="data-[state=active]:bg-secondary data-[state=active]:shadow-none data-[state=active]:text-secondary-foreground gap-2 rounded-full px-4 py-2"
                >
                  {label}
                  <Badge variant="outline" className="bg-background text-muted-foreground px-1.5 py-0 min-w-5 justify-center">
                    {statusCounts[status]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="min-w-full overflow-x-auto">
          <div className="min-w-[800px] grid grid-cols-[minmax(0,1fr)_100px_140px_120px_100px] items-center text-sm">
            <div className="col-span-full grid grid-cols-subgrid border-b border-border bg-muted/40 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ticket</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created On</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right pr-2">Actions</div>
            </div>

            {!ticketsReady ? (
              Array.from({ length: 4 }, (_, i) => (
                <TicketRow.Skeleton key={i} />
              ))
            ) : filteredTickets.length === 0 ? (
              <div className="col-span-full p-12 text-center text-muted-foreground">
                No tickets found.
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <TicketRow
                  key={ticket._id}
                  ticket={ticket}
                  movingTicketId={movingTicketId}
                  onMoveNext={(id) => void handleMove(id, "next")}
                  onMovePrev={(id) => void handleMove(id, "prev")}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

ProjectWorkspacePage.Skeleton = function ProjectWorkspacePageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-9 w-64 max-w-full rounded-md" />
          <Skeleton className="h-4 w-full max-w-xl rounded-md" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-64 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
      <div className="flex flex-col gap-6 border rounded-2xl bg-card overflow-hidden">
        <div className="px-6 pt-6 pb-2 flex gap-2">
           <Skeleton className="h-9 w-24 rounded-full" />
           <Skeleton className="h-9 w-24 rounded-full" />
           <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="min-w-full">
          <div className="grid grid-cols-[minmax(0,1fr)_100px_140px_120px_100px] items-center text-sm">
            <div className="col-span-full grid grid-cols-subgrid border-b border-border bg-muted/40 px-4 py-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12 justify-self-end" />
            </div>
            {Array.from({ length: 4 }, (_, i) => (
              <TicketRow.Skeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
