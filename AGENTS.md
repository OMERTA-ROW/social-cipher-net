## Architecture rules

- Voyage reuses the shared space texture, deep-sky, starfield, sun, and vessel modules while retaining its local interactive camera state, because the global background cameras are decorative and incompatible with its six modes.
- Voyage asteroid visuals use deterministic procedural geometry and regolith maps with explicit non-NASA attribution, because no verified asteroid image map is bundled and false sourcing is prohibited.
- Account integrations use server-verified OAuth attempts and the encrypted connector vault; browser code never creates connected status or stores provider secrets.
