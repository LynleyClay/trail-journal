'use client';

import { useEffect, useRef, useState } from 'react';
import type { GeocodeResult } from '@/lib/geocode';

type LocationSearchProps = {
  onSelect: (place: GeocodeResult) => void;
  disabled?: boolean;
};

export function LocationSearch({ onSelect, disabled }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      void fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Search failed');
          const data = (await res.json()) as { results?: GeocodeResult[] };
          setResults(data.results ?? []);
          setOpen(true);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setError(err instanceof Error ? err.message : 'Search failed');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function pick(place: GeocodeResult) {
    onSelect(place);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="block text-xs font-medium text-stone-600 mb-1">Search places</label>
      <input
        type="search"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        placeholder="Town, trailhead, landmark…"
        aria-label="Search places on the map"
        aria-expanded={open}
        aria-controls="location-search-results"
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
      />
      {loading && (
        <p className="text-xs text-stone-500 mt-1" role="status">
          Searching…
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
      {open && results.length > 0 && (
        <ul
          id="location-search-results"
          className="absolute z-[2000] mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg"
          role="listbox"
        >
          {results.map((place) => (
            <li key={place.placeId} role="option">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 border-b border-stone-100 last:border-b-0"
                onClick={() => pick(place)}
              >
                <span className="font-medium text-stone-900 block">{place.name}</span>
                <span className="text-xs text-stone-500">{place.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && query.trim().length >= 2 && results.length === 0 && !error && (
        <p className="absolute z-[2000] mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500 shadow">
          No places found — try a town or trail name.
        </p>
      )}
    </div>
  );
}
