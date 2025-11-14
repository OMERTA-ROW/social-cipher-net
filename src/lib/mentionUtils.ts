export const formatTextWithMentions = (text: string): string => {
  // Replace @username with styled spans for display
  return text.replace(/@(\w+)/g, '<span class="text-primary font-semibold">@$1</span>');
};

export const extractMentionedUsernames = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(m => m.substring(1)) : [];
};
