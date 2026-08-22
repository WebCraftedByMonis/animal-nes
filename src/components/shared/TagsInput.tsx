"use client";

import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface TagsInputProps {
  /** Optional autocomplete suggestions (e.g. known categories). */
  suggestions?: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

// Freeform multi-value input for things like "additional categories" — type
// a value and press Enter or "," to add it as a tag. Datalist gives a light
// autocomplete against `suggestions` without needing a full combobox.
export function TagsInput({ suggestions = [], value, onChange, placeholder }: TagsInputProps) {
  const [draft, setDraft] = useState("");
  const listId = "tags-input-suggestions";

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (!value.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      onChange([...value, tag]);
    }
    setDraft("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((v) => v !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      // Backspace on an empty input removes the last tag, mirroring how
      // most tag inputs behave.
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        list={suggestions.length > 0 ? listId : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={placeholder}
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-red-500">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
