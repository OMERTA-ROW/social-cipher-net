import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "like_post",
  title: "Like or unlike a post",
  description: "Like or remove a like from a post as the signed-in user.",
  inputSchema: {
    post_id: z.string().uuid().describe("Id of the post."),
    action: z.enum(["like", "unlike"]).default("like"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ post_id, action }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const me = ctx.getUserId() as string;

    if (action === "unlike") {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post_id)
        .eq("user_id", me);
      return error
        ? { content: [{ type: "text", text: error.message }], isError: true }
        : { content: [{ type: "text", text: "Like removed." }] };
    }

    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id, user_id: me });
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : { content: [{ type: "text", text: "Liked." }] };
  },
});
