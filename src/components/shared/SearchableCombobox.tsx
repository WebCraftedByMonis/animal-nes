"use client";

import { useState, useEffect, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import axios from "axios";

interface SearchableOption {
  id: number;
  label: string;
}

interface SearchableComboboxProps {
  apiEndpoint: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchKey: string; // e.g., 'companyName' or 'partnerName'
}

export function SearchableCombobox({ 
  apiEndpoint, 
  value, 
  onChange, 
  placeholder, 
  searchKey 
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<SearchableOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<SearchableOption | null>(null);

  // Debounce search function
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  // Search function
  const searchOptions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${apiEndpoint}/search`, {
        params: {
          search: query,
          limit: 20 // Limit results for better performance
        }
      });
      
      const data = response.data.data || [];
      const formattedOptions = data.map((item: any) => ({
        id: item.id,
        label: item[searchKey]
      }));
      
      setOptions(formattedOptions);
    } catch (error) {
      console.error("Search error:", error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, searchKey]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(searchOptions, 300),
    [searchOptions]
  );

  // Handle search input change
  const handleSearchChange = (query: string) => {
    setSearchTerm(query);
    debouncedSearch(query);
  };

  // Load selected item when value changes
  useEffect(() => {
    if (value && !selectedItem) {
      const fetchSelectedItem = async () => {
        try {
          const response = await axios.get(`${apiEndpoint}/${value}`);
          const item = response.data;
          if (item) {
            setSelectedItem({
              id: item.id,
              label: item[searchKey]
            });
          }
        } catch (error) {
          console.error("Error fetching selected item:", error);
        }
      };
      fetchSelectedItem();
    }
  }, [value, apiEndpoint, searchKey, selectedItem]);

  // Clear options when popover closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchTerm("");
      setOptions([]);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={searchTerm}
            onValueChange={handleSearchChange}
          />
          
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Searching...</span>
            </div>
          )}
          
          {!loading && searchTerm && options.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          
          {!loading && !searchTerm && (
            <div className="py-4 text-center text-sm text-gray-500">
              Start typing to search...
            </div>
          )}
          
          {!loading && options.length > 0 && (
            <CommandGroup>
              {options.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={() => {
                    onChange(String(item.id));
                    setSelectedItem(item);
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
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}