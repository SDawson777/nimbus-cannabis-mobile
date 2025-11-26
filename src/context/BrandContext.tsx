import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
}

interface BrandContextType {
  brand: Brand | null;
  loading: boolean;
  error: string | null;
  setBrand: (brand: Brand) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

// Default fallback brand for when API fails
const DEFAULT_BRAND: Brand = {
  id: 'default',
  name: 'Cannabis Platform',
  slug: 'default',
  primaryColor: '#16A34A',
  secondaryColor: '#15803D',
  logoUrl: undefined,
};

interface BrandProviderProps {
  children: ReactNode;
}

export function BrandProvider({ children }: BrandProviderProps) {
  const [brand, setBrandState] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setBrand = (newBrand: Brand) => {
    setBrandState(newBrand);
  };

  useEffect(() => {
    loadDefaultBrand();
  }, []);

  const loadDefaultBrand = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch the default brand from API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/brands/default`);

      if (response.ok) {
        const brandData = await response.json();
        setBrandState(brandData);
      } else {
        // Fallback to default brand if API call fails
        console.warn('Failed to load brand from API, using default');
        setBrandState(DEFAULT_BRAND);
      }
    } catch (err) {
      console.warn('Error loading brand, using default:', err);
      setError(err instanceof Error ? err.message : 'Failed to load brand');
      // Always fallback to default brand to prevent app crashes
      setBrandState(DEFAULT_BRAND);
    } finally {
      setLoading(false);
    }
  };

  const value: BrandContextType = {
    brand,
    loading,
    error,
    setBrand,
  };

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandContextType {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}

// Convenience hook to get just the brand data with fallback
export function useBrandData(): Brand {
  const { brand } = useBrand();
  return brand || DEFAULT_BRAND;
}
