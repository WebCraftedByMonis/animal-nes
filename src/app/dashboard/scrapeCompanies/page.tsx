'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Building2, MapPin, Phone, Mail, Star, Globe, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ScrapedCompany {
  id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  rating: number | null;
  reviews: number | null;
  website: string | null;
  city: string | null;
}

interface ScrapeError {
  name: string;
  error: string;
}

export default function ScrapeCompaniesPage() {
  const [businessType, setBusinessType] = useState('');
  const [city, setCity] = useState('');
  const [maxResults, setMaxResults] = useState(20);
  const [isScrapin, setIsScrapin] = useState(false);
  const [scrapedCompanies, setScrapedCompanies] = useState<ScrapedCompany[]>([]);
  const [errors, setErrors] = useState<ScrapeError[]>([]);
  const [showResults, setShowResults] = useState(false);

  async function handleScrape() {
    if (!businessType || !city) {
      toast.error('Please enter business type and city');
      return;
    }

    setIsScrapin(true);
    setShowResults(false);
    setScrapedCompanies([]);
    setErrors([]);

    try {
      const response = await fetch('/api/scrape-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          city,
          maxResults,
          headless: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Scraping failed');
      }

      toast.success(data.message);
      setScrapedCompanies(data.data.savedCompanies || []);
      setErrors(data.data.errors || []);
      setShowResults(true);

    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to scrape companies');
    } finally {
      setIsScrapin(false);
    }
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-green-500">Scrape Companies from Google Maps</h1>
          <p className="text-muted-foreground">
            Automatically find and import companies from Google Maps into your database
          </p>
        </div>

        {/* Scraping Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-green-500" />
              Search Parameters
            </CardTitle>
            <CardDescription>
              Enter the type of business and location to scrape from Google Maps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Business Type *</Label>
                <Input
                  placeholder="e.g., veterinary clinics, pharmacies"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="focus-visible:ring-2 focus-visible:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  placeholder="e.g., Lahore, Karachi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="focus-visible:ring-2 focus-visible:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label>Maximum Results</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={maxResults}
                  onChange={(e) => setMaxResults(parseInt(e.target.value) || 20)}
                  className="focus-visible:ring-2 focus-visible:ring-green-500"
                />
                <p className="text-xs text-muted-foreground">Max 50 companies per scrape</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleScrape}
                disabled={isScrapin || !businessType || !city}
                className="bg-green-500 hover:bg-green-600 text-white"
                size="lg"
              >
                {isScrapin ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scraping... This may take a few minutes
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Start Scraping
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {showResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-500" />
                  Scraped Companies ({scrapedCompanies.length})
                </span>
                {errors.length > 0 && (
                  <span className="text-sm text-orange-500">
                    {errors.length} errors
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scrapedCompanies.length === 0 && errors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No companies found</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Successfully scraped companies */}
                  {scrapedCompanies.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <h3 className="font-semibold">Successfully Added ({scrapedCompanies.length})</h3>
                      </div>
                      <div className="grid gap-4">
                        {scrapedCompanies.map((company) => (
                          <Card key={company.id} className="border-green-200">
                            <CardContent className="pt-6">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-semibold text-lg flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-green-500" />
                                      {company.name}
                                    </h4>
                                    {company.city && (
                                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                        <MapPin className="h-3 w-3" />
                                        {company.city}
                                      </p>
                                    )}
                                  </div>
                                  {company.rating && (
                                    <div className="flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full">
                                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                      <span className="font-semibold">{company.rating}</span>
                                      {company.reviews && (
                                        <span className="text-xs text-muted-foreground ml-1">
                                          ({company.reviews})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  {company.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 text-muted-foreground" />
                                      <span>{company.phone}</span>
                                    </div>
                                  )}
                                  {company.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4 text-muted-foreground" />
                                      <span>{company.email}</span>
                                    </div>
                                  )}
                                  {company.website && (
                                    <div className="flex items-center gap-2">
                                      <Globe className="h-4 w-4 text-muted-foreground" />
                                      <a
                                        href={company.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline"
                                      >
                                        {company.website}
                                      </a>
                                    </div>
                                  )}
                                  {company.address && (
                                    <div className="flex items-start gap-2 md:col-span-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <span>{company.address}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {errors.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-orange-600">
                        <XCircle className="h-5 w-5" />
                        <h3 className="font-semibold">Errors ({errors.length})</h3>
                      </div>
                      <div className="space-y-2">
                        {errors.map((error, idx) => (
                          <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <p className="font-medium">{error.name}</p>
                            <p className="text-sm text-muted-foreground">{error.error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
