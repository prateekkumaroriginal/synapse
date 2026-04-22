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
    // Phase 1: git / BTCA integration fields
    gitRemoteUrl: v.optional(v.string()),
    defaultBranch: v.optional(v.string()),
    btcaProjectId: v.optional(v.string()),
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
  projectResources: defineTable({
    projectId: v.id("projects"),
    url: v.string(),
    label: v.optional(v.string()),
    domain: v.string(),
  }).index("by_project", ["projectId"]),

  // Phase 1 stub — mutations added in Phase 2
  artifactVersions: defineTable({
    ticketId: v.id("tickets"),
    kind: v.union(v.literal("AC"), v.literal("PLAN"), v.literal("CODE")),
    version: v.number(),
    content: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    userPrompt: v.optional(v.string()),
    parentVersionId: v.optional(v.id("artifactVersions")),
    createdByJobId: v.optional(v.id("asyncJobs")),
  })
    .index("by_ticketId", ["ticketId"])
    .index("by_ticketId_and_kind", ["ticketId", "kind"]),

  // Phase 1 stub — mutations added in Phase 3
  asyncJobs: defineTable({
    ticketId: v.id("tickets"),
    projectId: v.id("projects"),
    type: v.union(
      v.literal("GENERATE_AC"),
      v.literal("GENERATE_PLAN"),
      v.literal("GENERATE_CODE"),
      v.literal("VALIDATE"),
      v.literal("FIX_AFTER_FAILURE"),
      v.literal("CREATE_PR"),
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    attempt: v.number(),
    args: v.any(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    idempotencyKey: v.string(),
    artifactVersionId: v.optional(v.id("artifactVersions")),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_ticketId", ["ticketId"])
    .index("by_idempotencyKey", ["idempotencyKey"]),
});
