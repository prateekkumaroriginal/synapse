import type { Doc, Id } from "../_generated/dataModel";

export async function assertProjectOwner(
  ctx: {
    db: {
      get: (
        table: "projects",
        id: Id<"projects">,
      ) => Promise<Doc<"projects"> | null>;
    };
  },
  projectId: Id<"projects">,
  userId: Id<"users">,
): Promise<Doc<"projects">> {
  const project = await ctx.db.get("projects", projectId);
  if (project === null) {
    throw new Error("Project not found");
  }

  if (project.ownerId !== userId) {
    throw new Error("Not allowed");
  }

  return project;
}

export async function hasProjectAccess(
  ctx: {
    db: {
      get: (
        table: "projects",
        id: Id<"projects">,
      ) => Promise<Doc<"projects"> | null>;
      query: (table: "projectMembers") => any;
    };
  },
  projectId: Id<"projects">,
  userId: Id<"users">,
): Promise<boolean> {
  const project = await ctx.db.get("projects", projectId);
  if (project === null) {
    return false;
  }

  if (project.ownerId === userId) {
    return true;
  }

  const member = await ctx.db
    .query("projectMembers")
    .withIndex("by_project_and_user", (q: any) =>
      q.eq("projectId", projectId).eq("userId", userId),
    )
    .unique();

  return member !== null;
}

export async function assertProjectAccess(
  ctx: {
    db: {
      get: (
        table: "projects",
        id: Id<"projects">,
      ) => Promise<Doc<"projects"> | null>;
      query: (table: "projectMembers") => any;
    };
  },
  projectId: Id<"projects">,
  userId: Id<"users">,
): Promise<Doc<"projects">> {
  const project = await ctx.db.get("projects", projectId);
  if (project === null) {
    throw new Error("Project not found");
  }

  if (project.ownerId === userId) {
    return project;
  }

  const member = await ctx.db
    .query("projectMembers")
    .withIndex("by_project_and_user", (q: any) =>
      q.eq("projectId", projectId).eq("userId", userId),
    )
    .unique();

  if (member === null) {
    throw new Error("Not allowed");
  }

  return project;
}
