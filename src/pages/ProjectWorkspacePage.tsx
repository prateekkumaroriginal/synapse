import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Settings, Ticket } from "lucide-react";
import { useQueryStates, parseAsString } from "nuqs";
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

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

  const [{ q: searchQuery, status: filterStatus }, setQueryStates] = useQueryStates({
    q: parseAsString.withDefault(""),
    status: parseAsString.withDefault("ALL")
  });

  const setSearchQuery = (q: string) => {
    void setQueryStates({ q });
  };
  const setFilterStatus = (status: string) => {
    void setQueryStates({ status });
  };

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

  const searchFilteredTickets = useMemo(() => {
    if (!tickets) return undefined;
    return tickets.filter((t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tickets, searchQuery]);

  const filteredTickets = useMemo(() => {
    if (!searchFilteredTickets) return undefined;
    return searchFilteredTickets.filter(
      (t) => filterStatus === "ALL" || t.status === filterStatus
    );
  }, [searchFilteredTickets, filterStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0 };
    Object.keys(TICKET_STATUS_LABELS).forEach((key) => {
      counts[key] = 0;
    });
    if (searchFilteredTickets) {
      searchFilteredTickets.forEach((t) => {
        counts.ALL++;
        counts[t.status] = (counts[t.status] || 0) + 1;
      });
    }
    return counts;
  }, [searchFilteredTickets]);

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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" asChild>
              <Link to={`/projects/${projectId}/settings`}>
                <Settings className="size-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
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
        {project.description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {project.description}
          </p>
        ) : null}
      </div>

      {tickets !== undefined && tickets.length === 0 ? (
        <Empty className="min-h-64 rounded-2xl md:min-h-80">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Ticket className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No tickets yet</EmptyTitle>
            <EmptyDescription>
              Create your first ticket to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateTicketDialog projectId={project._id} />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6 border rounded-2xl bg-card overflow-hidden">
          <div className="px-6 pt-6 flex overflow-x-auto pb-2">
          <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-full">
            <TabsList className="bg-transparent gap-2 h-auto p-0">
              <TabsTrigger 
                value="ALL" 
                className="relative z-10 hover:bg-transparent !bg-transparent !border-transparent data-[state=active]:!bg-transparent data-[state=active]:!border-transparent data-[state=active]:!shadow-none data-[state=active]:text-secondary-foreground gap-2 rounded-full px-4 py-2"
              >
                {filterStatus === "ALL" && (
                  <motion.div
                    layoutId="active-tab-bubble"
                    className="absolute inset-0 bg-secondary rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                All
                <Badge variant="outline" className="bg-background text-muted-foreground px-1.5 py-0 min-w-5 justify-center">
                  {statusCounts.ALL}
                </Badge>
              </TabsTrigger>
              {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => (
                <TabsTrigger 
                  key={status} 
                  value={status} 
                  className="relative z-10 hover:bg-transparent !bg-transparent !border-transparent data-[state=active]:!bg-transparent data-[state=active]:!border-transparent data-[state=active]:!shadow-none data-[state=active]:text-secondary-foreground gap-2 rounded-full px-4 py-2"
                >
                  {filterStatus === status && (
                    <motion.div
                      layoutId="active-tab-bubble"
                      className="absolute inset-0 bg-secondary rounded-full -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
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
      )}
    </div>
  );
}

ProjectWorkspacePage.Skeleton = function ProjectWorkspacePageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Skeleton className="h-9 w-64 max-w-full rounded-md" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-64 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
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
