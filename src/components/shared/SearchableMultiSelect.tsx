"use client";

import { useState, useEffect, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

interface SearchableOption {
  id: number;
  label: string;
}

interface SearchableMultiSelectProps {
  apiEndpoint: string;
  selected: number[];
  onChange: (selected: number[]) => void;
  placeholder: string;
  searchKey: string; // e.g., 'companyName' or 'partnerName'
  maxDisplay?: number;
}

export function SearchableMultiSelect({
  apiEndpoint,
  selected,
  onChange,
  placeholder,
  searchKey,
  maxDisplay = 3
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<SearchableOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<SearchableOption[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Debounce search function
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  // Load latest 10 items
  const loadInitialOptions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(apiEndpoint, {
        params: {
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'desc', // Company API uses sortOrder
          order: 'desc' // Partner API uses order
        }
      });

      const data = response.data.data || response.data || [];
      const formattedOptions = data.map((item: any) => ({
        id: item.id,
        label: item[searchKey]
      }));

      setOptions(formattedOptions);
      setInitialLoaded(true);
    } catch (error) {
      console.error("Error loading initial options:", error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, searchKey]);

  // Search function
  const searchOptions = useCallback(async (query: string) => {
    if (!query.trim()) {
      // If search is cleared, reload initial options
      if (initialLoaded) {
        loadInitialOptions();
      }
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
  }, [apiEndpoint, searchKey, initialLoaded, loadInitialOptions]);

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

  // Load selected items when selected array changes
  useEffect(() => {
    if (selected.length > 0) {
      const fetchSelectedItems = async () => {
        try {
          const promises = selected.map(id =>
            axios.get(`${apiEndpoint}/${id}`).catch(() => null)
          );

          const responses = await Promise.all(promises);
          const items = responses
            .filter(response => response && response.data)
            .map(response => ({
              id: response!.data.id,
              label: response!.data[searchKey]
            }));

          setSelectedItems(items);
        } catch (error) {
          console.error("Error fetching selected items:", error);
        }
      };
      fetchSelectedItems();
    } else {
      setSelectedItems([]);
    }
  }, [selected, apiEndpoint, searchKey]);

  // Load initial options when component mounts
  useEffect(() => {
    loadInitialOptions();
  }, [loadInitialOptions]);

  // Clear options when popover closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchTerm("");
      // Show initial options when popover closes
      if (initialLoaded) {
        loadInitialOptions();
      }
    } else {
      // Load initial options when popover opens if not already loaded
      if (!initialLoaded) {
        loadInitialOptions();
      }
    }
  };

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
      <Popover open={open} onOpenChange={handleOpenChange}>
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

            {!loading && !searchTerm && options.length === 0 && (
              <div className="py-4 text-center text-sm text-gray-500">
                Start typing to search...
              </div>
            )}

            {!loading && options.length > 0 && (
              <CommandGroup heading={!searchTerm ? `Latest 10 ${placeholder.toLowerCase()}s` : `Search Results`}>
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
            )}
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