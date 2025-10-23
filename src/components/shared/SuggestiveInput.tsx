"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown } from "lucide-react";

interface SuggestiveInputProps {
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function SuggestiveInput({ suggestions, value, onChange, placeholder }: SuggestiveInputProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="justify-between w-full overflow-hidden">
          <span className="truncate text-left flex-1">
            {value ? value : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full">
        <Command>
          <CommandInput
            placeholder={`Type or search ${placeholder.toLowerCase()}...`}
            value={value}
            onValueChange={onChange}
          />
          <CommandEmpty>No match found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {suggestions.map((item) => (
              <CommandItem
                key={item}
                value={item}
                onSelect={(currentValue) => {
                  onChange(currentValue);
                  setOpen(false);
                }}
                className="text-sm"
              >
                <span className="flex-1">{item}</span>
                {value === item && (
                  <Check className="ml-2 h-4 w-4 flex-shrink-0" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
