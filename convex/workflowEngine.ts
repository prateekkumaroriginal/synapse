import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertProjectAccess } from "./utils/projectAccess";
import { TICKET_STATUSES } from "./schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TicketPhase = (typeof TICKET_STATUSES)[number];

// Ordered list of phases that produce an artifact requiring approval before
// the ticket can advance to the next phase.
const GATED_PHASES: Partial<Record<TicketPhase, { kind: "AC" | "PLAN" | "CODE" }>> = {
  TEST_CASE: { kind: "AC" },
  PLANNING: { kind: "PLAN" },
  CODE_GENERATION: { kind: "CODE" },
};

// ---------------------------------------------------------------------------
// canAdvance — pure async helper (reads DB, no writes)
// ---------------------------------------------------------------------------

/**
 * Derives whether a ticket can move to `targetPhase` purely by querying
 * `artifactVersions` (and later `validationRuns`). No separate gate table is
 * maintained — this is the single source of truth check.
 */
async function canAdvance(
  ctx: MutationCtx,
  ticketId: Id<"tickets">,
  currentPhase: TicketPhase,
  targetPhase: TicketPhase,
): Promise<{ allowed: boolean; reason?: string }> {
  const currentIndex = TICKET_STATUSES.indexOf(currentPhase);
  const targetIndex = TICKET_STATUSES.indexOf(targetPhase);

  // Must be a forward move of exactly one step
  if (targetIndex !== currentIndex + 1) {
    return {
      allowed: false,
      reason: `Cannot jump from ${currentPhase} to ${targetPhase}; use rewindPhase to go backwards`,
    };
  }

  // Check the gate on the CURRENT phase (the phase we're leaving)
  const gate = GATED_PHASES[currentPhase];
  if (gate) {
    const approvedArtifact = await ctx.db
      .query("artifactVersions")
      .withIndex("by_ticketId_and_kind", (q) =>
        q.eq("ticketId", ticketId).eq("kind", gate.kind),
      )
      .filter((q) => q.eq(q.field("status"), "approved"))
      .first();

    if (approvedArtifact === null) {
      const labels: Record<string, string> = {
        AC: "acceptance criteria",
        PLAN: "implementation plan",
        CODE: "code",
      };
      return {
        allowed: false,
        reason: `Cannot advance: ${labels[gate.kind] ?? gate.kind} must be approved first`,
      };
    }
  }

  // TODO Phase 8: also require the latest validationRun to have PASSED before
  // completing. The approved-CODE artifact gate above is enforced via GATED_PHASES;
  // the validation-run check is a separate, additive condition.
  // Example:
  //   const latestRun = await ctx.db
  //     .query("validationRuns")
  //     .withIndex("by_ticketId", (q) => q.eq("ticketId", ticketId))
  //     .order("desc")
  //     .first();
  //   if (!latestRun || latestRun.overallStatus !== "PASSED") {
  //     return { allowed: false, reason: "Validation must pass before completing" };
  //   }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// advancePhase mutation
// ---------------------------------------------------------------------------

export const advancePhase = mutation({
  args: {
    ticketId: v.id("tickets"),
    to: v.union(...TICKET_STATUSES.map((s) => v.literal(s))),
  },
  handler: async (ctx, { ticketId, to }): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const ticket = await ctx.db.get("tickets", ticketId);
    if (ticket === null) throw new Error("Ticket not found");

    await assertProjectAccess(ctx, ticket.projectId, userId);

    const { allowed, reason } = await canAdvance(
      ctx,
      ticketId,
      ticket.status,
      to,
    );
    if (!allowed) throw new Error(reason ?? "Cannot advance phase");

    await ctx.db.patch("tickets", ticketId, { status: to });
  },
});

// ---------------------------------------------------------------------------
// rewindPhase mutation
// ---------------------------------------------------------------------------

export const rewindPhase = mutation({
  args: {
    ticketId: v.id("tickets"),
    to: v.union(...TICKET_STATUSES.map((s) => v.literal(s))),
  },
  handler: async (ctx, { ticketId, to }): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const ticket = await ctx.db.get("tickets", ticketId);
    if (ticket === null) throw new Error("Ticket not found");

    await assertProjectAccess(ctx, ticket.projectId, userId);

    const currentIndex = TICKET_STATUSES.indexOf(ticket.status);
    const targetIndex = TICKET_STATUSES.indexOf(to);

    if (targetIndex >= currentIndex) {
      throw new Error(
        `rewindPhase requires a backwards move; use advancePhase to go forwards`,
      );
    }

    await ctx.db.patch("tickets", ticketId, { status: to });
  },
});
