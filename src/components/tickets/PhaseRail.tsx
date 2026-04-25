import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { TICKET_STATUSES, TicketStatus, ArtifactType } from "../../../convex/schema";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PhaseRailProps {
  ticket: Doc<"tickets">;
  selectedPhase: TicketStatus;
  setSelectedPhase: (phase: TicketStatus) => void;
}

const GATED_PHASES: Partial<Record<TicketStatus, ArtifactType>> = {
  TEST_CASE: "AC",
  PLANNING: "PLAN",
  CODE_GENERATION: "CODE",
};

const PHASE_LABELS: Record<TicketStatus, string> = {
  BACKLOG: "Backlog",
  TEST_CASE: "Acceptance Criteria",
  PLANNING: "Technical Plan",
  CODE_GENERATION: "Code Generation",
  COMPLETED: "Completed",
};

export function PhaseRail({ ticket, selectedPhase, setSelectedPhase }: PhaseRailProps) {
  const artifacts = useQuery(api.artifacts.getTicketArtifacts, { ticketId: ticket._id });
  const advancePhase = useMutation(api.workflowEngine.advancePhase);
  const rewindPhase = useMutation(api.workflowEngine.rewindPhase);

  const [rewindDialogOpen, setRewindDialogOpen] = useState(false);
  const [rewindTarget, setRewindTarget] = useState<TicketStatus | null>(null);

  const currentIndex = TICKET_STATUSES.indexOf(ticket.status);

  // Determine if the *current* phase is gate-locked
  const activeGate = GATED_PHASES[ticket.status];
  const requiredArtifact = activeGate && artifacts
    ? artifacts.find(a => a.type === activeGate)
    : undefined;

  const isGateLocked = activeGate !== undefined && (!requiredArtifact || requiredArtifact.status !== "approved");

  const canAdvance = currentIndex < TICKET_STATUSES.length - 1 && !isGateLocked;
  const nextPhase = TICKET_STATUSES[currentIndex + 1];

  const handleAdvance = async () => {
    if (!nextPhase) return;
    try {
      await advancePhase({ ticketId: ticket._id, to: nextPhase });
      setSelectedPhase(nextPhase);
      toast.success(`Advanced to ${PHASE_LABELS[nextPhase]}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to advance phase");
    }
  };

  const attemptRewind = (target: TicketStatus) => {
    setRewindTarget(target);
    setRewindDialogOpen(true);
  };

  const confirmRewind = async () => {
    if (!rewindTarget) return;
    try {
      await rewindPhase({ ticketId: ticket._id, to: rewindTarget });
      setSelectedPhase(rewindTarget);
      toast.success(`Rewound back to ${PHASE_LABELS[rewindTarget]}`);
      setRewindDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to rewind phase");
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Visual Stepper */}
      <div className="bg-card border rounded-xl overflow-hidden p-6 shadow-sm flex flex-col gap-6">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Workflow Phases</h3>
        <div className="flex flex-col gap-4">
          {TICKET_STATUSES.map((phase, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isSelected = phase === selectedPhase;
            const phaseGate = GATED_PHASES[phase];

            // Check specific artifact for this phase node visually
            const phaseArtifact = artifacts?.find(a => a.type === phaseGate);
            const isNodeLocked = phaseGate !== undefined && (!phaseArtifact || phaseArtifact.status !== "approved");

            return (
              <div
                key={phase}
                className={cn(
                  "relative flex items-center gap-4 h-16 group cursor-pointer transition-all duration-200 p-2 -mx-2 rounded-lg hover:bg-muted/50",
                  isSelected && "bg-muted"
                )}
                onClick={() => setSelectedPhase(phase)}
                style={{ zIndex: TICKET_STATUSES.length - idx }}
              >
                {/* Vertical Line Connector */}
                {idx !== TICKET_STATUSES.length - 1 && (
                  <div className={cn(
                    "absolute top-12 left-[23px] h-12 w-[2px] transition-colors bg-primary",
                    idx >= currentIndex && "bg-muted-foreground/20"
                  )} />
                )}

                {/* Node Icon */}
                <div className={cn(
                  "relative z-10 shrink-0 size-8 rounded-full border-2 flex items-center justify-center bg-background transition-colors",
                  (isCompleted || isCurrent) && "border-primary text-primary",
                  !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground/30"
                )}>
                  {isCurrent && <div className="absolute inset-0 rounded-full animate-ping bg-primary/30" />}
                  {isCompleted ? <CheckCircle2 className="size-5 relative z-10" /> : (!isCompleted && !isCurrent ? <Lock className="size-4 relative z-10" /> : <span className="text-xs font-bold relative z-10">{idx + 1}</span>)}
                </div>

                {/* Node Label & Gate Lock */}
                <div className="flex-1 flex flex-col gap-1">
                  <p className={cn(
                    "font-medium text-sm transition-colors",
                    isCurrent && "text-primary font-bold",
                    isCompleted && "text-foreground",
                    !isCompleted && !isCurrent && "text-muted-foreground"
                  )}>
                    {PHASE_LABELS[phase]}
                  </p>

                  {isCurrent && phaseGate && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {isNodeLocked ? (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <Lock className="size-3" />
                          Approval Needed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="size-3" />
                          Approved
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Block */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 bg-muted/30 border-b">
          <h3 className="font-semibold text-sm">Phase Controls</h3>
        </div>
        <div className="p-4 flex items-center justify-between gap-3">
          <TooltipProvider>
            {currentIndex > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => attemptRewind(TICKET_STATUSES[currentIndex - 1])}
                  >
                    <ArrowLeft className="size-4 text-muted-foreground" />
                    Rewind
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Return to the previous phase</p>
                </TooltipContent>
              </Tooltip>
            )}

            {isGateLocked ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1 flex">
                    <Button disabled className="w-full">
                      Advance
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Must approve artifact to advance.</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                className="flex-1"
                disabled={!canAdvance}
                onClick={handleAdvance}
              >
                Advance
                <ArrowRight className="size-4" />
              </Button>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={rewindDialogOpen} onOpenChange={setRewindDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the active ticket workflow backwards to <span className="font-bold text-foreground">{rewindTarget ? PHASE_LABELS[rewindTarget] : ""}</span>.
              Existing artifacts will <strong>not</strong> be deleted, but you will need to re-approve them if you want to advance past them again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRewind} className="bg-amber-600 hover:bg-amber-700">
              Confirm Rewind
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
