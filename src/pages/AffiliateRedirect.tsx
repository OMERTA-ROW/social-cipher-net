import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Branded short link: /r/:code records the click, then forwards to the
 * merchant's affiliate destination.
 */
const AffiliateRedirect = () => {
  const { code } = useParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!code) return;
      const { data, error: linkError } = await supabase
        .from("external_affiliate_links")
        .select("id, affiliate_url, is_active")
        .eq("short_code", code)
        .maybeSingle();

      if (!alive) return;
      if (linkError || !data || !data.is_active) {
        setError("This link is no longer active.");
        return;
      }
      try {
        await supabase.functions.invoke("track-external-affiliate-click", {
          body: { linkId: data.id },
        });
      } catch {
        /* never block the redirect on tracking */
      }
      window.location.replace(data.affiliate_url);
    })();
    return () => { alive = false; };
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center text-center px-6">
      {error ? (
        <p className="text-muted-foreground">{error}</p>
      ) : (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Taking you there...
        </div>
      )}
    </div>
  );
};

export default AffiliateRedirect;
