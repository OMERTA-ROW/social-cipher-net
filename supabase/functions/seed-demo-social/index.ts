import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_DOMAIN = "demo.cyberlink.local";

interface DemoUser {
  handle: string;
  name: string;
  bio: string;
  posts: string[];
}

const DEMO_USERS: DemoUser[] = [
  {
    handle: "nova_kestrel",
    name: "Nova Kestrel",
    bio: "Orbital drift pilot. Mapping the quiet lanes between Ceres and the Belt.",
    posts: [
      "Slingshot burn completed at 04:12 station time. The Belt looks like spilled diamonds from up here.",
      "Reminder: recalibrate your inertial dampers before a long haul. Learned that one the hard way.",
    ],
  },
  {
    handle: "vex_holloway",
    name: "Vex Holloway",
    bio: "Neural interface engineer. I make wetware talk to silicon without screaming.",
    posts: [
      "Shipped a latency patch for the cortical bridge — 9ms down to 3ms. Your thoughts now arrive before your doubts.",
      "Hot take: most 'AI alignment' problems are really just bad UX in disguise.",
    ],
  },
  {
    handle: "sable_rho",
    name: "Sable Rho",
    bio: "Synth-wave composer. Sound design for derelict stations and long silences.",
    posts: [
      "New track: 'Cold Start (Reactor Mix)'. Built entirely from recorded hull resonance.",
      "There is a specific frequency a station makes at 3am. I have been chasing it for two years.",
    ],
  },
  {
    handle: "orion_dane",
    name: "Orion Dane",
    bio: "Deep-field astronomer. Currently arguing with a telescope.",
    posts: [
      "Caught a lensing artifact tonight that refuses to behave. Either the math is wrong or the universe is.",
      "Twelve hours of exposure for one frame. Worth every minute.",
    ],
  },
  {
    handle: "iris_kade",
    name: "Iris Kade",
    bio: "Quantum security researcher. Breaking things responsibly since the last epoch.",
    posts: [
      "Rotated my keys, rotated my locks, rotated my expectations. Standard Tuesday.",
      "If your rate limiting lives only in the client, you do not have rate limiting.",
    ],
  },
  {
    handle: "juno_castellan",
    name: "Juno Castellan",
    bio: "Terraform logistics. Moving water where water has never been.",
    posts: [
      "Third aquifer seeded in the northern basin. In eleven years there will be rain here.",
      "Patience is the only real terraforming tool. Everything else is plumbing.",
    ],
  },
  {
    handle: "riven_ash",
    name: "Riven Ash",
    bio: "Salvage runner. If it drifts, I can probably sell it.",
    posts: [
      "Pulled a pre-collapse nav computer out of a hulk today. Still had the last course plotted in memory.",
      "Rule one of salvage: the pretty wrecks are the dangerous ones.",
    ],
  },
  {
    handle: "cyra_lin",
    name: "Cyra Lin",
    bio: "Holo-artist. Painting with light that has nowhere to land.",
    posts: [
      "Finished a twelve-metre volumetric piece for the transit hub. It only exists when you walk through it.",
      "Colour theory hits different when your canvas is vacuum.",
    ],
  },
  {
    handle: "atlas_grim",
    name: "Atlas Grim",
    bio: "Reactor tech, third shift. Keeping the lights on so you can post.",
    posts: [
      "Containment held through the surge. Nobody will notice, which is the whole point of the job.",
      "The hum of a healthy reactor is the most reassuring sound in the system.",
    ],
  },
  {
    handle: "echo_ваlen",
    name: "Echo Valen",
    bio: "Signals analyst. I listen to static for a living and sometimes it listens back.",
    posts: [
      "Anomalous burst on the long band, 41 seconds, repeating prime intervals. Probably nothing. Probably.",
      "Everyone wants first contact. Nobody wants the paperwork.",
    ],
  },
];

const REPLIES = [
  "This is exactly the kind of signal I subscribed for.",
  "Bookmarking this for the next long haul.",
  "Ran into the same thing last cycle — glad it's not just me.",
  "Genuinely beautiful work.",
  "Do you have the raw telemetry for this anywhere?",
  "Reading this from a maintenance crawlspace and it made my shift better.",
  "Okay this reframed the whole problem for me.",
  "The quiet part of space is the best part of space.",
];

const avatarFor = (handle: string) =>
  `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(handle)}`;

const pick = <T,>(arr: T[], n: number) =>
  [...arr].sort(() => Math.random() - 0.5).slice(0, n);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // --- Auth: only an admin account may seed or purge demo data ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin role required");

    const body = await req.json().catch(() => ({}));
    const action = body?.action === "purge" ? "purge" : "seed";

    // --- Purge: remove every seeded account and all its content ---
    if (action === "purge") {
      const { data: demoProfiles } = await admin
        .from("profiles")
        .select("id")
        .eq("is_demo", true);
      const ids = (demoProfiles ?? []).map((p: { id: string }) => p.id);
      for (const id of ids) {
        await admin.auth.admin.deleteUser(id);
      }
      return new Response(JSON.stringify({ purged: ids.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Seed ---
    const { count: existing } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_demo", true);

    if ((existing ?? 0) > 0) {
      return new Response(
        JSON.stringify({ seeded: 0, message: "Demo data already present. Purge first to reseed." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const created: { id: string; handle: string }[] = [];

    for (const demo of DEMO_USERS) {
      const email = `${demo.handle.toLowerCase()}@${DEMO_DOMAIN}`;
      const { data: authUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: crypto.randomUUID() + crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { username: demo.handle, display_name: demo.name, is_demo: true },
      });
      if (createErr || !authUser?.user) continue;

      const id = authUser.user.id;
      await admin.from("profiles").update({
        username: demo.handle,
        display_name: demo.name,
        bio: demo.bio,
        avatar_url: avatarFor(demo.handle),
        is_demo: true,
        is_verified: Math.random() > 0.6,
      }).eq("id", id);

      created.push({ id, handle: demo.handle });
    }

    // Root posts, spread over the last ~5 days so the feed looks lived-in
    const rootPostIds: { id: string; author: string }[] = [];
    let offsetMinutes = 20;
    for (const demo of DEMO_USERS) {
      const author = created.find((c) => c.handle === demo.handle);
      if (!author) continue;
      for (const content of demo.posts) {
        offsetMinutes += Math.floor(Math.random() * 420) + 45;
        const createdAt = new Date(Date.now() - offsetMinutes * 60_000).toISOString();
        const { data: post } = await admin
          .from("posts")
          .insert({
            user_id: author.id,
            content,
            is_demo: true,
            monetization_type: "free",
            created_at: createdAt,
          })
          .select("id")
          .single();
        if (post) rootPostIds.push({ id: post.id, author: author.id });
      }
    }

    // Replies
    let replyCount = 0;
    for (const post of rootPostIds) {
      const responders = pick(created.filter((c) => c.id !== post.author), Math.floor(Math.random() * 3));
      for (const responder of responders) {
        const { error } = await admin.from("posts").insert({
          user_id: responder.id,
          parent_post_id: post.id,
          content: REPLIES[Math.floor(Math.random() * REPLIES.length)],
          is_demo: true,
          monetization_type: "free",
        });
        if (!error) replyCount++;
      }
    }

    // Likes
    let likeCount = 0;
    for (const post of rootPostIds) {
      const likers = pick(created.filter((c) => c.id !== post.author), Math.floor(Math.random() * 7));
      for (const liker of likers) {
        const { error } = await admin
          .from("post_likes")
          .insert({ post_id: post.id, user_id: liker.id });
        if (!error) likeCount++;
      }
    }

    // Follow graph
    let followCount = 0;
    for (const person of created) {
      const targets = pick(created.filter((c) => c.id !== person.id), 3 + Math.floor(Math.random() * 4));
      for (const target of targets) {
        const { error } = await admin
          .from("followers")
          .insert({ follower_id: person.id, following_id: target.id });
        if (!error) followCount++;
      }
    }

    return new Response(
      JSON.stringify({
        seeded: created.length,
        posts: rootPostIds.length,
        replies: replyCount,
        likes: likeCount,
        follows: followCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message.includes("Unauthorized") || message.includes("Admin") ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
