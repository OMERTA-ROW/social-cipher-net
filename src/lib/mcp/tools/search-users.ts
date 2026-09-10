import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_users",
  title: "Search people",
  description: "Find Cyber Link Social members by username or display name.",
  inputSchema: {
    query: z.string().trim().min(1).max(80).describe("Name or handle to search for."),
    limit: z.number().int().min(1).max(25).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const term = query.replace(/[%_,]/g, " ").trim();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, is_verified")
      .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
      .limit(limit);

    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { users: data ?? [] },
    };
  },
});
