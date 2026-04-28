import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { TicketStatus } from "../../convex/schema";
import { PhaseRail } from "../components/tickets/PhaseRail";
import { ArtifactPanel } from "../components/tickets/ArtifactPanel";
import { JobStatusPanel } from "../components/tickets/JobStatusPanel";
import { ValidationRunsPanel } from "../components/tickets/ValidationRunsPanel";
import { Loader2 } from "lucide-react";

export function TicketDetailPage() {
  const { projectId, ticketId } = useParams<{ projectId: string; ticketId: string }>();
  const [selectedPhaseOverride, setSelectedPhaseOverride] = useState<TicketStatus | null>(null);

  const parsedProjectId = projectId as Id<"projects">;
  const parsedTicketId = ticketId as Id<"tickets">;

  const project = useQuery(api.projects.getProject, { projectId: parsedProjectId });
  const ticket = useQuery(api.tickets.get, { ticketId: parsedTicketId });

  if (project === undefined || ticket === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (project === null || ticket === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-bold">Not Found</h2>
          <p className="text-muted-foreground">The ticket or project you are looking for does not exist.</p>
        </div>
        <Link to="/" className="text-primary hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  const selectedPhase = selectedPhaseOverride ?? ticket.status;

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">

      {/* Main Grid Layout */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">

          {/* Left Column: Phase Rail */}
          <div className="xl:col-span-3">
            <PhaseRail
              ticket={ticket}
              selectedPhase={selectedPhase}
              setSelectedPhase={setSelectedPhaseOverride}
            />
          </div>

          {/* Center Column: Artifact Panel */}
          <div className="xl:col-span-6">
            <ArtifactPanel
              ticketId={parsedTicketId}
              selectedPhase={selectedPhase}
              currentTicketPhase={ticket.status}
            />
          </div>

          {/* Right Column: Job Status Sidebar */}
          <div className="flex flex-col gap-6 xl:col-span-3">
            <JobStatusPanel ticketId={parsedTicketId} />
            <ValidationRunsPanel ticketId={parsedTicketId} />
          </div>

        </div>
      </main>
    </div>
  );
}
