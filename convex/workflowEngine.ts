import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertProjectAccess } from "./utils/projectAccess";
import { TICKET_STATUSES } from "./schema";
import type { TicketStatus, ArtifactType, JobType } from "./schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  AC: "Acceptance Criteria",
  PLAN: "Implementation Plan",
  CODE: "Code",
};

// Ordered list of phases that produce an artifact requiring approval before
// the ticket can advance to the next phase.
const GATED_PHASES: Partial<Record<TicketStatus, { kind: ArtifactType }>> = {
  TEST_CASE: { kind: "AC" },
  PLANNING: { kind: "PLAN" },
  CODE_GENERATION: { kind: "CODE" },
};

const PHASE_TO_JOB_TYPE: Partial<Record<TicketStatus, JobType>> = {
  TEST_CASE: "GENERATE_AC",
  PLANNING: "GENERATE_PLAN",
  CODE_GENERATION: "GENERATE_CODE",
};

function buildBaseJobArgsForPhase(
  ticket: {
    title: string;
    description?: string;
    type: "TASK" | "BUG";
  },
  project: {
    gitRemoteUrl?: string;
    defaultBranch?: string;
  },
  phase: TicketStatus,
  userPrompt: string,
) {
  return {
    phase,
    ticketTitle: ticket.title,
    ticketDescription: ticket.description ?? null,
    ticketType: ticket.type,
    gitRemoteUrl: project.gitRemoteUrl ?? null,
    defaultBranch: project.defaultBranch ?? null,
    userPrompt,
  };
}

async function getApprovedAcceptanceCriteriaForPlan(
  ctx: MutationCtx,
  ticketId: Id<"tickets">,
): Promise<{
  approvedAcceptanceCriteria: string;
  approvedAcceptanceCriteriaArtifactId: Id<"artifacts">;
}> {
  const artifact = await ctx.db
    .query("artifacts")
    .withIndex("by_ticketId_and_type", (q) =>
      q.eq("ticketId", ticketId).eq("type", "AC"),
    )
    .unique();

  if (artifact === null) {
    throw new Error("Approved Acceptance Criteria is required before generating a plan");
  }

  if (artifact.status !== "approved") {
    throw new Error("Acceptance Criteria must be approved before generating a plan");
  }

  const content = artifact.content.trim();

  if (content.length === 0) {
    throw new Error("Approved Acceptance Criteria is empty");
  }

  return {
    approvedAcceptanceCriteria: content,
    approvedAcceptanceCriteriaArtifactId: artifact._id,
  };
}

async function buildJobArgsForPhase(
  ctx: MutationCtx,
  ticketId: Id<"tickets">,
  ticket: {
    title: string;
    description?: string;
    type: "TASK" | "BUG";
  },
  project: {
    gitRemoteUrl?: string;
    defaultBranch?: string;
  },
  phase: TicketStatus,
  userPrompt: string,
) {
  const baseArgs = buildBaseJobArgsForPhase(ticket, project, phase, userPrompt);

  if (phase !== "PLANNING") {
    return baseArgs;
  }

  return {
    ...baseArgs,
    ...(await getApprovedAcceptanceCriteriaForPlan(ctx, ticketId)),
  };
}

async function hasActiveJob(
  ctx: MutationCtx,
  ticketId: Id<"tickets">,
): Promise<boolean> {
  const jobs = await ctx.db
    .query("asyncJobs")
    .withIndex("by_ticketId", (q) => q.eq("ticketId", ticketId))
    .order("desc")
    .collect();

  return jobs.some(
    (job) => job.status === "queued" || job.status === "running",
  );
}

async function enqueuePhaseEntryJob(
  ctx: MutationCtx,
  ticketId: Id<"tickets">,
  to: TicketStatus,
): Promise<void> {
  const jobType = PHASE_TO_JOB_TYPE[to] ?? null;

  if (jobType === null) {
    return;
  }

  const ticket = await ctx.db.get("tickets", ticketId);
  if (ticket === null) {
    throw new Error("Ticket not found");
  }

  if (await hasActiveJob(ctx, ticketId)) {
    return;
  }

  const project = await ctx.db.get("projects", ticket.projectId);
  if (project === null) {
    throw new Error("Project not found");
  }

  const idempotencyKey = `ticket:${ticketId}:phase:${to}:job:${jobType}`;
  const existing = await ctx.db
    .query("asyncJobs")
    .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
    .unique();

  if (existing !== null) {
    return;
  }

  await ctx.db.insert("asyncJobs", {
    ticketId,
    projectId: ticket.projectId,
    type: jobType,
    status: "queued",
    attempt: 0,
    args: await buildJobArgsForPhase(ctx, ticketId, ticket, project, to, ""),
    idempotencyKey,
  });
}

// ---------------------------------------------------------------------------
// canAdvance — pure async helper (reads DB, no writes)
// ---------------------------------------------------------------------------

/**
 * Derives whether a ticket can move to `targetPhase` purely by querying
 * `artifacts` (and later `validationRuns`). No separate gate table is
 * maintained — this is the single source of truth check.
 */
async function canAdvance(
  ctx: MutationCtx,
  ticketId: Id<"tickets">,
  currentPhase: TicketStatus,
  targetPhase: TicketStatus,
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
    // Single artifact per (ticketId, type) — .unique() is sufficient.
    const artifact = await ctx.db
      .query("artifacts")
      .withIndex("by_ticketId_and_type", (q) =>
        q.eq("ticketId", ticketId).eq("type", gate.kind),
      )
      .unique();

    if (artifact === null) {
      return {
        allowed: false,
        reason: `No ${ARTIFACT_LABELS[gate.kind]} exists. Generate and approve ${ARTIFACT_LABELS[gate.kind]} first.`,
      };
    }

    if (artifact.status !== "approved") {
      return {
        allowed: false,
        reason: `${ARTIFACT_LABELS[gate.kind]} is ${artifact.status}. It must be approved before advancing.`,
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
    await enqueuePhaseEntryJob(ctx, ticketId, to);
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

// ---------------------------------------------------------------------------
// requestRegeneration mutation
// ---------------------------------------------------------------------------

export const requestRegeneration = mutation({
  args: {
    ticketId: v.id("tickets"),
    phase: v.union(...TICKET_STATUSES.map((s) => v.literal(s))),
    userPrompt: v.string(),
  },
  handler: async (ctx, { ticketId, phase, userPrompt }): Promise<Id<"asyncJobs">> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const ticket = await ctx.db.get("tickets", ticketId);
    if (ticket === null) throw new Error("Ticket not found");

    await assertProjectAccess(ctx, ticket.projectId, userId);

    if (ticket.status !== phase) {
      throw new Error(`Ticket is currently in ${ticket.status}, cannot regenerate for ${phase}`);
    }

    const jobType = PHASE_TO_JOB_TYPE[phase] ?? null;

    if (jobType === null) {
      throw new Error(`Phase ${phase} does not support regeneration`);
    }

    if (await hasActiveJob(ctx, ticketId)) {
      throw new Error("A job is already queued or running for this ticket");
    }

    const project = await ctx.db.get("projects", ticket.projectId);
    if (project === null) {
      throw new Error("Project not found");
    }

    return await ctx.db.insert("asyncJobs", {
      ticketId,
      projectId: ticket.projectId,
      type: jobType,
      status: "queued",
      attempt: 0,
      args: await buildJobArgsForPhase(
        ctx,
        ticketId,
        ticket,
        project,
        phase,
        userPrompt.trim(),
      ),
      idempotencyKey: crypto.randomUUID(),
    });
  },
});
