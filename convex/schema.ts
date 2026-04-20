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

export const ticketStatus = v.union(
  ...TICKET_STATUSES.map((s) => v.literal(s))
);

export const ticketType = v.union(
  v.literal("TASK"),
  v.literal("BUG"),
);

const { users, ...otherAuthTables } = authTables;

export default defineSchema({
  ...otherAuthTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .searchIndex("search_name", { searchField: "name" }),
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    isArchived: v.boolean(),
  }).index("by_owner", ["ownerId"]),
  projectMembers: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_project_and_user", ["projectId", "userId"]),
  tickets: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    type: ticketType,
    status: ticketStatus,
  }).index("by_project", ["projectId"]),
});
