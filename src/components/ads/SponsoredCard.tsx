import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { recordAdEvent, type AdCreative, type AdPlacement } from "@/hooks/useAdSlot";

interface Props {
  creative: AdCreative;
  placement: AdPlacement;
}

/**
 * A paid placement rendered in the same shape as a post, always labelled
 * "Sponsored". One impression is recorded the first time it becomes visible.
 */
const SponsoredCard = ({ creative, placement }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const logged = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !logged.current) {
        logged.current = true;
        recordAdEvent(creative.id, "impression", placement);
      }
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [creative.id, placement]);

  const open = () => {
    recordAdEvent(creative.id, "click", placement);
    window.open(creative.cta_url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card
      ref={ref}
      className="p-4 border-primary/20 transition-colors hover:border-primary/60 hover:shadow-[0_0_18px_hsl(var(--primary)/0.25)]"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">{creative.advertiser ?? "Advertiser"}</span>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Sponsored</Badge>
      </div>
      <h3 className="font-semibold mb-1">{creative.headline}</h3>
      {creative.body && <p className="text-sm text-muted-foreground mb-3">{creative.body}</p>}
      {creative.image_url && (
        <img
          src={creative.image_url}
          alt={creative.headline}
          loading="lazy"
          className="w-full max-h-80 object-contain rounded-md mb-3 bg-black/40"
        />
      )}
      <Button variant="outline" size="sm" onClick={open}>
        {creative.cta_label}
        <ExternalLink className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
};

export default SponsoredCard;
