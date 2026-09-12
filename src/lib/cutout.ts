/**
 * Cuts the figure out of a photo so it can stand freely on the page with a
 * transparent background. The model runs in the browser and is only loaded
 * when someone actually switches to standing-character mode.
 */
export async function cutOutSubject(imageUrl: string): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  const response = await fetch(imageUrl, { mode: "cors" });
  if (!response.ok) throw new Error("Could not read that image");
  return await removeBackground(await response.blob(), { output: { format: "image/png" } });
}
