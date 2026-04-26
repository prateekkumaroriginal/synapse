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

export const ARTIFACT_TYPES = [
  "AC",
  "PLAN",
  "CODE",
] as const;

export const JOB_TYPES = [
  "GENERATE_AC",
  "GENERATE_PLAN",
  "GENERATE_CODE",
  "VALIDATE",
  "FIX_AFTER_FAILURE",
  "CREATE_PR",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
export type JobType = (typeof JOB_TYPES)[number];

export const ticketStatus = v.union(
  ...TICKET_STATUSES.map((s) => v.literal(s))
);

export const ticketType = v.union(
  v.literal("TASK"),
  v.literal("BUG"),
);

export const artifactType = v.union(
  ...ARTIFACT_TYPES.map((s) => v.literal(s))
);

export const jobType = v.union(
  ...JOB_TYPES.map((s) => v.literal(s))
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

  artifacts: defineTable({
    ticketId: v.id("tickets"),
    type: artifactType,
    content: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("approved"),
    ),
    userPrompt: v.optional(v.string()),
    createdByJobId: v.optional(v.id("asyncJobs")),
  })
    .index("by_ticketId", ["ticketId"])
    .index("by_ticketId_and_type", ["ticketId", "type"]),

  asyncJobs: defineTable({
    ticketId: v.id("tickets"),
    projectId: v.id("projects"),
    type: jobType,
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
    artifactId: v.optional(v.id("artifacts")),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_ticketId", ["ticketId"])
    .index("by_projectId", ["projectId"])
    .index("by_idempotencyKey", ["idempotencyKey"])
});
