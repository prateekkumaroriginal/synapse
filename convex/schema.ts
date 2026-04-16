import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const TICKET_STATUSES = [
  "BACKLOG",
  "TEST_CASE",
  "PLANNING",
  "CODE_GENERATION",
  "COMPLETED",
] as const;

export const ticketStatusValidator = v.union(
  v.literal("BACKLOG"),
  v.literal("TEST_CASE"),
  v.literal("PLANNING"),
  v.literal("CODE_GENERATION"),
  v.literal("COMPLETED"),
);

export const ticketTypeValidator = v.union(
  v.literal("TASK"),
  v.literal("BUG"),
);

export default defineSchema({
  ...authTables,
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
  }).index("by_owner", ["ownerId"]),
  tickets: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    type: ticketTypeValidator,
    status: ticketStatusValidator,
  }).index("by_project", ["projectId"]),
});
