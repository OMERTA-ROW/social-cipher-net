/**
 * Unfinished post draft shared by every post form on the site.
 * Text is kept in localStorage (survives reloads); attached files stay in
 * memory for the session (browsers cannot persist File objects safely).
 */
export interface DraftMedia {
  file: File;
  preview: string;
  type: "image" | "video";
}
export interface PostDraft {
  content: string;
  media: DraftMedia[];
}

const KEY = "cyberlink:post-draft";
let memoryMedia: DraftMedia[] = [];

export function loadDraft(): PostDraft {
  let content = "";
  try {
    content = localStorage.getItem(KEY) ?? "";
  } catch {
    /* storage unavailable */
  }
  return { content, media: memoryMedia };
}

export function saveDraft(draft: PostDraft) {
  memoryMedia = draft.media;
  try {
    if (draft.content) localStorage.setItem(KEY, draft.content);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

export function clearDraft() {
  memoryMedia = [];
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
