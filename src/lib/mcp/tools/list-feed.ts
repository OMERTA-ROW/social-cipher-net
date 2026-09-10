import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_feed",
  title: "List feed posts",
  description:
    "List recent posts on Cyber Link Social. Use scope 'following' for posts from accounts the signed-in user follows, or 'discover' for recent public posts.",
  inputSchema: {
    scope: z
      .enum(["discover", "following", "mine"])
      .default("discover")
      .describe("Which feed to read."),
    limit: z.number().int().min(1).max(50).default(20).describe("How many posts to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ scope, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId() as string;

    let authorIds: string[] | null = null;
    if (scope === "following") {
      const { data: follows, error } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", userId)
        .limit(1000);
      if (error)
        return { content: [{ type: "text", text: error.message }], isError: true };
      authorIds = (follows ?? []).map((f) => f.following_id as string);
      if (authorIds.length === 0)
        return {
          content: [{ type: "text", text: "You are not following anyone yet." }],
          structuredContent: { posts: [] },
        };
    } else if (scope === "mine") {
      authorIds = [userId];
    }

    let query = supabase
      .from("posts")
      .select(
        "id, content, created_at, like_count, reply_count, view_count, is_demo, profiles!posts_user_id_fkey(username, display_name)"
      )
      .is("parent_post_id", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (authorIds) query = query.in("user_id", authorIds);

    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { posts: data ?? [] },
    };
  },
});
