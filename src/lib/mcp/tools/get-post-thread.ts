import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_post_thread",
  title: "Read a post thread",
  description: "Read a single post and its replies.",
  inputSchema: {
    post_id: z.string().uuid().describe("Id of the root post."),
    reply_limit: z.number().int().min(1).max(100).default(30),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ post_id, reply_limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const select =
      "id, content, created_at, like_count, reply_count, profiles!posts_user_id_fkey(username, display_name)";

    const { data: post, error } = await supabase
      .from("posts")
      .select(select)
      .eq("id", post_id)
      .maybeSingle();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    if (!post)
      return { content: [{ type: "text", text: "Post not found." }], isError: true };

    const { data: replies } = await supabase
      .from("posts")
      .select(select)
      .eq("parent_post_id", post_id)
      .order("created_at", { ascending: true })
      .limit(reply_limit);

    const thread = { post, replies: replies ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(thread, null, 2) }],
      structuredContent: thread,
    };
  },
});
