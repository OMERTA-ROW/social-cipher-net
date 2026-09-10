import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description:
    "Get the signed-in user's Cyber Link Social profile plus follower and following counts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, is_verified, created_at")
      .eq("id", userId as string)
      .maybeSingle();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    if (!profile)
      return { content: [{ type: "text", text: "No profile found." }], isError: true };

    const { data: counts } = await supabase.rpc("get_follow_counts", {
      target_user: userId as string,
    });
    const follow = Array.isArray(counts) ? counts[0] : counts;

    const result = { ...profile, ...(follow ?? {}) };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: { profile: result },
    };
  },
});
