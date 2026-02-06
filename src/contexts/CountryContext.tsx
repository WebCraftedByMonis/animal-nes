'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Country = 'Pakistan' | 'UAE';

interface CountryContextType {
  country: Country;
  setCountry: (country: Country) => void;
  currency: string;
  currencySymbol: string;
  phonePrefix: string;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

const COUNTRY_CONFIG = {
  Pakistan: {
    currency: 'PKR',
    currencySymbol: 'Rs.',
    phonePrefix: '+92',
  },
  UAE: {
    currency: 'AED',
    currencySymbol: 'AED',
    phonePrefix: '+971',
  },
};

export function CountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<Country>('Pakistan');

  // Load saved country from localStorage on mount
  useEffect(() => {
    const savedCountry = localStorage.getItem('selectedCountry') as Country;
    if (savedCountry && (savedCountry === 'Pakistan' || savedCountry === 'UAE')) {
      setCountryState(savedCountry);
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
