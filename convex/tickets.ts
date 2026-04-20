import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ticketCreateFormSchema } from "./validations";
import { ticketType } from "./schema";
import { isTicketStatus, nextStatus, prevStatus } from "./ticketWorkflow";

import { assertProjectAccess, hasProjectAccess } from "./utils/projectAccess";

export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }): Promise<Doc<"tickets">[]> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const hasAccess = await hasProjectAccess(ctx, projectId, userId);
    if (!hasAccess) {
      return [];
    }

    return await ctx.db
      .query("tickets")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    type: ticketType,
  },
  handler: async (ctx, args): Promise<Id<"tickets">> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    await assertProjectAccess(ctx, args.projectId, userId);

    const parsed = ticketCreateFormSchema.parse({
      title: args.title,
      description: args.description ?? "",
      type: args.type,
    });

    return await ctx.db.insert("tickets", {
      projectId: args.projectId,
      title: parsed.title,
      description: parsed.description,
      type: parsed.type,
      status: "BACKLOG",
    });
  },
});

export const move = mutation({
  args: {
    ticketId: v.id("tickets"),
    direction: v.union(v.literal("next"), v.literal("prev")),
  },
  handler: async (ctx, { ticketId, direction }): Promise<void> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const ticket = await ctx.db.get("tickets", ticketId);
    if (ticket === null) {
      throw new Error("Ticket not found");
    }

    await assertProjectAccess(ctx, ticket.projectId, userId);

    if (!isTicketStatus(ticket.status)) {
      throw new Error("Invalid ticket status");
    }

    const current = ticket.status;
    const target =
      direction === "next" ? nextStatus(current) : prevStatus(current);
    if (target === null) {
      throw new Error(
        direction === "next"
          ? "Ticket is already at the last stage"
          : "Ticket is already at the first stage",
      );
    }

    await ctx.db.patch("tickets", ticketId, { status: target });
  },
});
