'use client';

import { useCountry, Country } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const countries: { value: Country; label: string; flag: string }[] = [
  { value: 'Pakistan', label: 'Pakistan', flag: '🇵🇰' },
  { value: 'UAE', label: 'UAE', flag: '🇦🇪' },
];

export default function CountrySwitcher() {
  const { country, setCountry } = useCountry();
  const currentCountry = countries.find((c) => c.value === country);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 h-7 px-2 text-[11px]">
          <Globe className="h-3 w-3" />
          <span className="hidden sm:inline">{currentCountry?.flag} {currentCountry?.label}</span>
          <span className="sm:hidden">{currentCountry?.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {countries.map((c) => (
          <DropdownMenuItem
            key={c.value}
            onClick={() => setCountry(c.value)}
            className={country === c.value ? 'bg-green-50 text-green-700' : ''}
          >
            <span className="mr-2">{c.flag}</span>
            {c.label}
            {country === c.value && <span className="ml-auto text-green-600">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
