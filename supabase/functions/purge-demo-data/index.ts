import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * One-off maintenance task: deletes every account flagged as demo content and
 * all data owned by it. It can only ever touch rows where profiles.is_demo is
 * true, and it is removed from the project once the cleanup has run.
 */
Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: demoProfiles, error } = await admin
    .from("profiles")
    .select("id")
    .eq("is_demo", true);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let purged = 0;
  for (const profile of demoProfiles ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(profile.id);
    if (!delErr) purged += 1;
  }

  return new Response(JSON.stringify({ purged, found: (demoProfiles ?? []).length }), {
    headers: { "Content-Type": "application/json" },
  });
});
