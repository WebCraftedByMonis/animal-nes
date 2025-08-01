"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown } from "lucide-react";

interface ComboboxSelectProps {
  options: { id: number; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function ComboboxSelect({ options, value, onChange, placeholder }: ComboboxSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedItem = options.find((item) => String(item.id) === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-full"
        >
          {selectedItem ? selectedItem.label : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 max-h-60 overflow-y-auto">

        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandEmpty>No result found.</CommandEmpty>
          <CommandGroup>
            {options.map((item) => (
              <CommandItem
                key={item.id}
                value={item.label}
                onSelect={() => {
                  onChange(String(item.id));
                  setOpen(false);
                }}
              >
                {item.label}
                {String(item.id) === value && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
