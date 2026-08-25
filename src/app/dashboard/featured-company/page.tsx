'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, Sparkles, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface CompanyOption {
  id: number;
  companyName: string | null;
  image?: { url: string } | null;
}

interface FeaturedCompanyData {
  id: number;
  companyId: number | null;
  isActive: boolean;
  tagline: string | null;
  ctaText: string | null;
  rankingBoostMultiplier: number;
  company: { id: number; companyName: string | null; country: string | null; image?: { url: string } | null } | null;
}

export default function FeaturedCompanyPage() {
  const [featured, setFeatured] = useState<FeaturedCompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [tagline, setTagline] = useState('');
  const [ctaText, setCtaText] = useState('Shop Now');
  const [boostMultiplier, setBoostMultiplier] = useState(3);

  // Company search combobox
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [companySearchLoading, setCompanySearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFeatured = useCallback(() => {
    setLoading(true);
    console.log('[featured-company] loading current settings…');
    fetch('/api/admin/featured-company')
      .then((res) => res.json())
      .then((data) => {
        console.log('[featured-company] loaded:', data);
        const f: FeaturedCompanyData = data.featured;
        setFeatured(f);
        setSelectedCompany(f.company ? { id: f.company.id, companyName: f.company.companyName, image: f.company.image } : null);
        setIsActive(f.isActive);
        setTagline(f.tagline || '');
        setCtaText(f.ctaText || 'Shop Now');
        setBoostMultiplier(f.rankingBoostMultiplier || 3);
      })
      .catch((err) => {
        console.error('[featured-company] failed to load:', err);
        toast.error('Failed to load featured company settings');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadFeatured();
  }, [loadFeatured]);

  const fetchCompanyOptions = useCallback(async (search: string) => {
    setCompanySearchLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/company/search?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setCompanyOptions((data.data || []).map((c: CompanyOption) => ({ id: c.id, companyName: c.companyName, image: c.image })));
      }
    } catch (err) {
      console.error('[featured-company] company search failed:', err);
      setCompanyOptions([]);
    } finally {
      setCompanySearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (companySearchOpen && companyOptions.length === 0 && !companySearchLoading) {
      fetchCompanyOptions('');
    }
  }, [companySearchOpen, companyOptions.length, companySearchLoading, fetchCompanyOptions]);

  const handleCompanySearchChange = (value: string) => {
    setCompanySearchTerm(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => fetchCompanyOptions(value), 300);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      companyId: selectedCompany ? selectedCompany.id : null,
      isActive,
      tagline,
      ctaText,
      rankingBoostMultiplier: boostMultiplier,
    };
    console.log('[featured-company] saving:', payload);
    try {
      const response = await fetch('/api/admin/featured-company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      console.log('[featured-company] save response:', response.status, data);

      if (response.ok) {
        toast.success(
          isActive && selectedCompany
            ? `${selectedCompany.companyName} is now boosted — rankings are recalculating in the background`
            : 'Featured company settings saved'
        );
        loadFeatured();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (err) {
      console.error('[featured-company] save failed:', err);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !featured) {
    return <div className="p-6 text-center py-12"><p className="text-gray-500">Loading...</p></div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Featured Company</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            Spotlight one company sitewide — a homepage banner + highlighted rail, and a real ranking boost for
            their products on the shop page. Free, admin-set — not the vendor-paid boost/sponsor form. The banner
            uses that company&apos;s own logo, so there&apos;s nothing to upload here.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-700 p-6 space-y-6">
        <div className="flex items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-700 p-3">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">Spotlight active</p>
            <p className="text-xs text-gray-500">Turn off anytime to stop boosting and hide the banner.</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
          <Popover open={companySearchOpen} onOpenChange={setCompanySearchOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={companySearchOpen}
                className="w-full justify-between font-normal"
              >
                <span className={selectedCompany ? '' : 'text-muted-foreground'}>
                  {selectedCompany ? selectedCompany.companyName : 'Search companies…'}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Type a company name…"
                  value={companySearchTerm}
                  onValueChange={handleCompanySearchChange}
                />
                {companySearchLoading && (
                  <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
                  </div>
                )}
                {!companySearchLoading && companyOptions.length === 0 && (
                  <CommandEmpty>No companies found.</CommandEmpty>
                )}
                {!companySearchLoading && companyOptions.length > 0 && (
                  <CommandGroup className="max-h-60 overflow-y-auto">
                    {companyOptions.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={String(c.id)}
                        onSelect={() => {
                          setSelectedCompany(c);
                          setCompanySearchOpen(false);
                        }}
                      >
                        {c.companyName}
                        {selectedCompany?.id === c.id && <Check className="ml-auto h-4 w-4" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {selectedCompany && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Banner preview (their logo)
            </label>
            {selectedCompany.image?.url ? (
              <div className="rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-muted">
                <img src={selectedCompany.image.url} alt={selectedCompany.companyName || ''} className="w-full h-40 object-contain" />
              </div>
            ) : (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-md p-3">
                This company has no logo uploaded yet (see {selectedCompany.companyName ? `${selectedCompany.companyName}'s` : 'their'} record
                under Companies). The homepage banner will show a plain placeholder until one is added.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tagline</label>
          <textarea
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            rows={2}
            placeholder="e.g. Trusted veterinary essentials, now spotlighted for you"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Button text</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ranking boost multiplier
            </label>
            <input
              type="number"
              min={1}
              max={10}
              step={0.5}
              value={boostMultiplier}
              onChange={(e) => setBoostMultiplier(parseFloat(e.target.value) || 1)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Stacks with sponsorship/new-vendor boosts. Default 3×.</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save & Apply'}
        </Button>
      </div>
    </div>
  );
}
