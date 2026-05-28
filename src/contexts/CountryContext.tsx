'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Country = 'Pakistan' | 'UAE';

interface CountryContextType {
  country: Country;
  setCountry: (country: Country) => void;
  currency: string;
  currencySymbol: string;
  phonePrefix: string;
  locationName: string;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

const COUNTRY_CONFIG = {
  Pakistan: {
    currency: 'PKR',
    currencySymbol: 'Rs.',
    phonePrefix: '+92',
    locationName: 'Pakistan',
  },
  UAE: {
    currency: 'AED',
    currencySymbol: 'AED',
    phonePrefix: '+971',
    locationName: 'Dubai',
  },
};

export function CountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<Country>('Pakistan');

  useEffect(() => {
    const savedCountry = localStorage.getItem('selectedCountry') as Country;
    if (savedCountry === 'Pakistan' || savedCountry === 'UAE') {
      setCountryState(savedCountry);
    } else {
      // First visit — auto-detect from IP
      fetch('https://ipapi.co/country/')
        .then((res) => res.text())
        .then((code) => {
          const detected: Country = code.trim() === 'AE' ? 'UAE' : 'Pakistan';
          setCountryState(detected);
          localStorage.setItem('selectedCountry', detected);
        })
        .catch(() => {
          // Keep default (Pakistan) on network error
        });
    }
  }, []);

  const setCountry = (newCountry: Country) => {
    setCountryState(newCountry);
    localStorage.setItem('selectedCountry', newCountry);
  };

  const config = COUNTRY_CONFIG[country];

  return (
    <CountryContext.Provider
      value={{
        country,
        setCountry,
        currency: config.currency,
        currencySymbol: config.currencySymbol,
        phonePrefix: config.phonePrefix,
        locationName: config.locationName,
      }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (context === undefined) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
}
