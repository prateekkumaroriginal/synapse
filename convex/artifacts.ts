import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertProjectAccess, hasProjectAccess } from "./utils/projectAccess";
import { artifactType } from "./schema";
import type { TicketStatus, ArtifactType } from "./schema";
// ---------------------------------------------------------------------------
// Phase → artifact type constraint
// ---------------------------------------------------------------------------

/**
 * Each ticket phase that produces an artifact maps to exactly one artifact
 * type. Phases not in this map (BACKLOG, COMPLETED) cannot have artifacts
 * created for them.
 */
const PHASE_ARTIFACT_TYPE = {
  TEST_CASE: "AC",
  PLANNING: "PLAN",
  CODE_GENERATION: "CODE",
} as const satisfies Partial<Record<TicketStatus, ArtifactType>>;

// ---------------------------------------------------------------------------
// upsertArtifact
// ---------------------------------------------------------------------------

/**
 * Upsert the artifact for a ticket's current phase.
 *
 * - The artifact `type` must match the ticket's current phase
 *   (TEST_CASE → AC, PLANNING → PLAN, CODE_GENERATION → CODE).
 * - Exactly one artifact exists per (ticketId, type). If one already exists,
 *   its content is overwritten and status is reset to `"draft"`.
 * - If no artifact exists yet, a new row is inserted.
 */
export const upsertArtifact = mutation({
  args: {
    ticketId: v.id("tickets"),
    type: artifactType,
    content: v.string(),
    userPrompt: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { ticketId, type, content, userPrompt },
  ): Promise<Id<"artifacts">> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const ticket = await ctx.db.get("tickets", ticketId);
    if (ticket === null) throw new Error("Ticket not found");

    await assertProjectAccess(ctx, ticket.projectId, userId);

    // Enforce phase-to-type constraint.
    const expectedType = PHASE_ARTIFACT_TYPE[ticket.status as keyof typeof PHASE_ARTIFACT_TYPE];
    if (expectedType === undefined) {
      throw new Error(
        `Tickets in phase "${ticket.status}" do not have artifacts`,
      );
    }
    if (type !== expectedType) {
      throw new Error(
        `Phase "${ticket.status}" only accepts artifacts of type "${expectedType}", got "${type}"`,
      );
    }

    const existing = await ctx.db
      .query("artifacts")
      .withIndex("by_ticketId_and_type", (q) =>
        q.eq("ticketId", ticketId).eq("type", type),
      )
      .unique();

    if (existing !== null) {
      await ctx.db.patch("artifacts", existing._id, {
        content,
        status: "draft",
        ...(userPrompt !== undefined && { userPrompt }),
      });
      return existing._id;
    }

    return await ctx.db.insert("artifacts", {
      ticketId,
      type,
      content,
      status: "draft",
      ...(userPrompt !== undefined && { userPrompt }),
    });
  },
});

// ---------------------------------------------------------------------------
// approveArtifact
// ---------------------------------------------------------------------------

/**
 * Mark the artifact as `"approved"`.
 *
 * Once approved, the `canAdvance` gate in `workflowEngine.ts` unblocks the
 * corresponding phase transition automatically.
 */
export const approveArtifact = mutation({
  args: { artifactId: v.id("artifacts") },
  handler: async (ctx, { artifactId }): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const artifact = await ctx.db.get("artifacts", artifactId);
    if (artifact === null) throw new Error("Artifact not found");

    const ticket = await ctx.db.get("tickets", artifact.ticketId);
    if (ticket === null) throw new Error("Ticket not found");

    await assertProjectAccess(ctx, ticket.projectId, userId);

    await ctx.db.patch("artifacts", artifactId, { status: "approved" });
  },
});

// ---------------------------------------------------------------------------
// unapproveArtifact
// ---------------------------------------------------------------------------

/**
 * Reset the artifact back to `"draft"`, re-locking the phase gate.
 *
 * Use this to withdraw approval without discarding the artifact content.
 * To replace the content entirely, call `upsertArtifact` which also resets
 * to draft.
 */
export const unapproveArtifact = mutation({
  args: { artifactId: v.id("artifacts") },
  handler: async (ctx, { artifactId }): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const artifact = await ctx.db.get("artifacts", artifactId);
    if (artifact === null) throw new Error("Artifact not found");

    const ticket = await ctx.db.get("tickets", artifact.ticketId);
    if (ticket === null) throw new Error("Ticket not found");

    await assertProjectAccess(ctx, ticket.projectId, userId);

    await ctx.db.patch("artifacts", artifactId, { status: "draft" });
  },
});

// ---------------------------------------------------------------------------
// getTicketArtifacts
// ---------------------------------------------------------------------------

/**
 * Return all artifacts for a ticket (at most 3 — one per phase type).
 *
 * Returns `[]` if the caller is not authenticated or lacks project access.
 */
export const getTicketArtifacts = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }): Promise<Doc<"artifacts">[]> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const ticket = await ctx.db.get("tickets", ticketId);
    if (ticket === null) return [];

    if (!(await hasProjectAccess(ctx, ticket.projectId, userId))) return [];

    return await ctx.db
      .query("artifacts")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", ticketId))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// getArtifact
// ---------------------------------------------------------------------------

/**
 * Fetch the artifact for a specific (ticketId, type) pair.
 *
 * Returns `null` if no artifact exists for that pair or the caller lacks
 * access. `(ticketId, type)` is the natural key in the simplified model.
 */
export const getArtifact = query({
  args: { artifactId: v.id("artifacts") },
  handler: async (
    ctx,
    { artifactId },
  ): Promise<Doc<"artifacts"> | null> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const artifact = await ctx.db.get("artifacts", artifactId);
    if (artifact === null) return null;

    const ticket = await ctx.db.get("tickets", artifact.ticketId);
    if (ticket === null) return null;

    if (!(await hasProjectAccess(ctx, ticket.projectId, userId))) return null;

    return artifact;
  },
});
