import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
  }).index("by_owner", ["ownerId"]),
});
