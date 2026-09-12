import { useEngagementStats } from "@/hooks/useEngagementStats";

/**
 * Compact live activity strip in the top bar. Only shows for a signed-in
 * account and only ever renders that account's real totals.
 */
const TopBarStats = () => {
  const { stats, loading } = useEngagementStats();

  if (loading || !stats) return null;

  const items: { label: string; value: number }[] = [
    { label: "Posts", value: stats.posts },
    { label: "Likes", value: stats.likes },
    { label: "Replies", value: stats.replies },
    { label: "Followers", value: stats.followers },
    { label: "Following", value: stats.following },
    { label: "Engagement", value: stats.engagement },
  ];

  return (
    <div className="hidden md:flex min-w-0 flex-1 items-center justify-center gap-3 lg:gap-5 overflow-hidden">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center leading-tight">
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {item.value.toLocaleString()}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default TopBarStats;
