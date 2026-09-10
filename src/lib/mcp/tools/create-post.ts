import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_post",
  title: "Create a post",
  description:
    "Publish a post as the signed-in user on Cyber Link Social. Pass parent_post_id to reply to an existing post.",
  inputSchema: {
    content: z.string().trim().min(1).max(2000).describe("The post text."),
    parent_post_id: z
      .string()
      .uuid()
      .optional()
      .describe("Optional id of the post being replied to."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ content, parent_post_id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: ctx.getUserId() as string,
        content,
        parent_post_id: parent_post_id ?? null,
      })
      .select("id, content, created_at, parent_post_id")
      .single();

    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Posted: ${data.id}` }],
      structuredContent: { post: data },
    };
  },
});
