import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "follow_user",
  title: "Follow or unfollow a member",
  description:
    "Follow or unfollow another Cyber Link Social member as the signed-in user.",
  inputSchema: {
    user_id: z.string().uuid().describe("Profile id of the member."),
    action: z.enum(["follow", "unfollow"]).default("follow"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ user_id, action }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const me = ctx.getUserId() as string;
    if (user_id === me)
      return {
        content: [{ type: "text", text: "You cannot follow yourself." }],
        isError: true,
      };
    const supabase = supabaseForUser(ctx);

    if (action === "unfollow") {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", me)
        .eq("following_id", user_id);
      return error
        ? { content: [{ type: "text", text: error.message }], isError: true }
        : { content: [{ type: "text", text: "Unfollowed." }] };
    }

    const { error } = await supabase
      .from("followers")
      .insert({ follower_id: me, following_id: user_id });
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : { content: [{ type: "text", text: "Followed." }] };
  },
});
