import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail } from "lucide-react";

interface Stats {
  followers: number;
  posts: number;
  likes: number;
  replies: number;
  views: number;
}

/**
 * Public creator media kit. Every figure is queried live from the creator's
 * real activity — nothing on this page is estimated.
 */
const MediaKit = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [kit, setKit] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [topPosts, setTopPosts] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!slug) return;
      const { data: kitRow } = await supabase
        .from("creator_media_kits")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!alive) return;
      if (!kitRow) { setLoading(false); return; }
      setKit(kitRow);

      const [profileRes, followerRes, postsRes] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, avatar_url, is_verified, bio")
          .eq("id", kitRow.user_id).maybeSingle(),
        supabase.from("followers").select("id", { count: "exact", head: true }).eq("following_id", kitRow.user_id),
        supabase.from("posts").select("id, content, like_count, reply_count, view_count, created_at")
          .eq("user_id", kitRow.user_id).order("like_count", { ascending: false }).limit(50),
      ]);
      if (!alive) return;

      const posts = postsRes.data ?? [];
      setProfile(profileRes.data);
      setStats({
        followers: followerRes.count ?? 0,
        posts: posts.length,
        likes: posts.reduce((s, p: any) => s + (p.like_count ?? 0), 0),
        replies: posts.reduce((s, p: any) => s + (p.reply_count ?? 0), 0),
        views: posts.reduce((s, p: any) => s + (p.view_count ?? 0), 0),
      });
      setTopPosts(posts.slice(0, 5));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!kit) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
          This media kit is not available.
        </div>
      </div>
    );
  }

  const engagement =
    stats && stats.views > 0 ? ((stats.likes + stats.replies) / stats.views) * 100 : null;

  return (
    <div className="min-h-screen bg-transparent">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <header className="flex items-center gap-4">
          {profile?.avatar_url && (
            <img src={profile.avatar_url} alt={profile.display_name ?? "Creator"}
              className="h-20 w-20 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-3xl font-bold">{profile?.display_name || profile?.username || "Creator"}</h1>
            {profile?.username && <p className="text-muted-foreground">@{profile.username}</p>}
            {kit.niche && <Badge variant="outline" className="mt-2">{kit.niche}</Badge>}
          </div>
        </header>

        {kit.headline && <p className="text-xl">{kit.headline}</p>}
        {kit.bio && <p className="text-muted-foreground">{kit.bio}</p>}

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            { label: "Followers", value: stats?.followers ?? 0 },
            { label: "Posts", value: stats?.posts ?? 0 },
            { label: "Reach (views)", value: stats?.views ?? 0 },
            { label: "Engagement", value: engagement === null ? "—" : `${engagement.toFixed(1)}%` },
          ].map((item) => (
            <Card key={item.label}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{item.label}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{item.value}</div></CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top posts</CardTitle>
            <CardDescription>Ranked by real likes.</CardDescription>
          </CardHeader>
          <CardContent>
            {topPosts.length === 0 ? (
              <p className="text-muted-foreground">No posts published yet.</p>
            ) : (
              <div className="space-y-3">
                {topPosts.map((post) => (
                  <div key={post.id} className="p-3 border rounded-lg">
                    <p className="text-sm line-clamp-2">{post.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {post.like_count ?? 0} likes · {post.reply_count ?? 0} replies · {post.view_count ?? 0} views
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {Array.isArray(kit.rate_card) && kit.rate_card.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Rates</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {kit.rate_card.map((item: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.price}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {kit.contact_email && (
          <p className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4" />
            <a className="underline" href={`mailto:${kit.contact_email}`}>{kit.contact_email}</a>
          </p>
        )}
      </div>
    </div>
  );
};

export default MediaKit;
