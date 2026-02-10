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
  extraParams?: Record<string, string | number | boolean | undefined>;
}

export function SearchableCombobox({ 
  apiEndpoint, 
  value, 
  onChange, 
  placeholder, 
  searchKey,
  extraParams
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<SearchableOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<SearchableOption | null>(null);
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
          order: 'desc', // Partner API uses order
          ...extraParams
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
  }, [apiEndpoint, searchKey, extraParams]);

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
          limit: 20, // Limit results for better performance
          ...extraParams
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
  }, [apiEndpoint, searchKey, initialLoaded, loadInitialOptions, extraParams]);

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
          
          {!loading && !searchTerm && options.length === 0 && (
            <div className="py-4 text-center text-sm text-gray-500">
              Start typing to search...
            </div>
          )}
          
          {!loading && options.length > 0 && (
            <CommandGroup heading={!searchTerm ? `Latest 10 ${placeholder.toLowerCase()}s` : `Search Results`}>
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
