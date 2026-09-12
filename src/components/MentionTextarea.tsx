import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentions: string[]) => void;
  placeholder?: string;
  className?: string;
}

interface UserSuggestion {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export const MentionTextarea = ({
  value,
  onChange,
  onMentionsChange,
  placeholder,
  className,
}: MentionTextareaProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionSearch, setMentionSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const searchUsers = async (search: string) => {
    if (!search) {
      setSuggestions([]);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
      .limit(5);

    setSuggestions(data || []);
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    
    // Extract mentions and notify parent
    const mentions = extractMentions(newValue);
    onMentionsChange?.(mentions);

    // Check if user is typing a mention
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(" ") && textAfterAt.length > 0) {
        setMentionSearch(textAfterAt);
        searchUsers(textAfterAt);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else if (textAfterAt.length === 0) {
        setShowSuggestions(true);
        searchUsers("");
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (user: UserSuggestion) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    const newValue =
      textBeforeCursor.substring(0, lastAtIndex) +
      `@${user.username} ` +
      textAfterCursor;

    onChange(newValue);
    setShowSuggestions(false);

    // Update mentions
    const mentions = extractMentions(newValue);
    onMentionsChange?.(mentions);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && showSuggestions) {
      e.preventDefault();
      insertMention(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 border border-transparent hover:border-primary hover:text-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.4)] transition-colors",
                index === selectedIndex && "bg-accent"
              )}
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  {(user.display_name || user.username || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="font-medium">{user.display_name || user.username}</span>
                <span className="text-sm text-muted-foreground">@{user.username}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
