'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'forex_favorite_pairs';
const DEFAULT_FAVORITES = ['EURUSD', 'GBPUSD', 'USDCAD', 'NZDCAD'];

// Global memory cache to prevent flashes between component mounts
let globalFavorites: string[] | null = null;

export function useFavoritePairs() {
  const [favorites, setFavoritesState] = useState<string[]>(() => {
    if (globalFavorites !== null) return globalFavorites;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            globalFavorites = parsed;
            return parsed;
          }
        }
      } catch {
        // Fallback
      }
    }
    return DEFAULT_FAVORITES;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync state across multiple mounted hooks / tabs via custom window event
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        globalFavorites = customEvent.detail;
        setFavoritesState(customEvent.detail);
      }
    };

    window.addEventListener('forex_favorites_updated', handleSync);
    return () => window.removeEventListener('forex_favorites_updated', handleSync);
  }, []);

  // Fetch latest favorites from server on initial mount
  useEffect(() => {
    let isMounted = true;

    async function fetchFromServer() {
      try {
        const res = await fetch('/api/favorites');
        const data = await res.json();
        if (data.success && Array.isArray(data.favorites) && isMounted) {
          globalFavorites = data.favorites;
          setFavoritesState(data.favorites);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.favorites));
          } catch {
            // Storage quota/error ignore
          }
        }
      } catch (err) {
        console.error('Failed to sync favorites from server:', err);
      }
    }

    fetchFromServer();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateStateAndBroadcast = useCallback((newList: string[]) => {
    globalFavorites = newList;
    setFavoritesState(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch {
      // Storage quota/error ignore
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('forex_favorites_updated', { detail: newList })
      );
    }
  }, []);

  const isFavorite = useCallback(
    (symbol: string) => {
      if (!symbol) return false;
      const clean = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      return favorites.some(f => f.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === clean);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (symbol: string) => {
      if (!symbol) return;
      const clean = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const exists = favorites.some(f => f.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === clean);
      
      const nextFavorites = exists
        ? favorites.filter(f => f.replace(/[^A-Za-z0-9]/g, '').toUpperCase() !== clean)
        : [...favorites, clean];

      // Optimistic client update
      updateStateAndBroadcast(nextFavorites);

      // Async server persist
      try {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: clean, isFavorite: !exists })
        });
      } catch (err) {
        console.error('Failed to persist favorite toggle:', err);
      }
    },
    [favorites, updateStateAndBroadcast]
  );

  const setFavorite = useCallback(
    async (symbol: string, shouldBeFav: boolean) => {
      if (!symbol) return;
      const clean = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const exists = favorites.some(f => f.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === clean);

      if (exists === shouldBeFav) return; // No-op

      const nextFavorites = shouldBeFav
        ? [...favorites, clean]
        : favorites.filter(f => f.replace(/[^A-Za-z0-9]/g, '').toUpperCase() !== clean);

      updateStateAndBroadcast(nextFavorites);

      try {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: clean, isFavorite: shouldBeFav })
        });
      } catch (err) {
        console.error('Failed to set favorite:', err);
      }
    },
    [favorites, updateStateAndBroadcast]
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    setFavorite,
    isLoading
  };
}
