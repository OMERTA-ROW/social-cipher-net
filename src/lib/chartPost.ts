import { supabase } from "@/integrations/supabase/client";

interface ChartPostDetails {
  symbol: string;
  timeframe: string;
  chartType: string;
  indicators: string[];
  source: string;
  asOf: number;
}

const canvasBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not capture this chart."))), "image/png");
  });

export async function publishChartSnapshot(canvas: HTMLCanvasElement, details: ChartPostDetails) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to post a chart.");

  const capturedAt = new Date(details.asOf).toISOString();
  const studies = details.indicators.length ? details.indicators.join(", ") : "none";
  const content = `${details.symbol} · ${details.timeframe} · ${details.chartType}\nIndicators: ${studies}\nSource: ${details.source} · data as of ${capturedAt}`;
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({ user_id: user.id, content, monetization_type: "free", price: 0 })
    .select("id")
    .single();
  if (postError) throw postError;

  try {
    const blob = await canvasBlob(canvas);
    const path = `${user.id}/chart-${details.symbol.replace(/[^A-Z0-9_-]/gi, "-")}-${Date.now()}.png`;
    const { data: upload, error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(path, blob, { contentType: "image/png" });
    if (uploadError) throw uploadError;
    const { data: publicData } = supabase.storage.from("post-media").getPublicUrl(upload.path);
    const { error: mediaError } = await supabase.from("post_media").insert({
      post_id: post.id,
      media_url: publicData.publicUrl,
      media_type: "image",
      display_order: 0,
    });
    if (mediaError) throw mediaError;
    return post.id;
  } catch (error) {
    await supabase.from("posts").delete().eq("id", post.id);
    throw error;
  }
}