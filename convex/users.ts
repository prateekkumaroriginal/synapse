import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

export type ViewerProfile = {
  email: string | null;
  name: string | null;
};

export const getViewerProfile = query({
  args: {},
  handler: async (ctx): Promise<ViewerProfile | null> => {
    const userId: Id<"users"> | null = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get("users", userId);
    if (user === null) {
      return null;
    }
    return {
      email: user.email ?? null,
      name: user.name ?? null,
    };
  },
});
