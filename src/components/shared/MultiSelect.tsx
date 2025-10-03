"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MultiSelectProps {
  options: { id: number; label: string }[];
  selected: number[];
  onChange: (selected: number[]) => void;
  placeholder: string;
  maxDisplay?: number;
}

export function MultiSelect({ options, selected, onChange, placeholder, maxDisplay = 3 }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedItems = options.filter(option => selected.includes(option.id));

  const handleSelect = (optionId: number) => {
    if (selected.includes(optionId)) {
      onChange(selected.filter(id => id !== optionId));
    } else {
      onChange([...selected, optionId]);
    }
  };

  const handleRemove = (optionId: number) => {
    onChange(selected.filter(id => id !== optionId));
  };

  const displayText = () => {
    if (selectedItems.length === 0) return placeholder;
    if (selectedItems.length <= maxDisplay) {
      return selectedItems.map(item => item.label).join(", ");
    }
    return `${selectedItems.slice(0, maxDisplay).map(item => item.label).join(", ")} +${selectedItems.length - maxDisplay} more`;
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full"
          >
            <span className="truncate">{displayText()}</span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 max-h-60 overflow-y-auto w-full">
          <Command>
            <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
            <CommandEmpty>No result found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.label}
                  onSelect={() => handleSelect(option.id)}
                >
                  {option.label}
                  {selected.includes(option.id) && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedItems.map(item => (
            <Badge key={item.id} variant="secondary" className="text-xs">
              {item.label}
              <button
                onClick={() => handleRemove(item.id)}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}