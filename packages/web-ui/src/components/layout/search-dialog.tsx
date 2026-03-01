'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useSearch } from '@/lib/hooks/use-search';
import { Badge } from '@/components/ui/badge';

const labelColors: Record<string, string> = {
  LogicalService: 'bg-blue-100 text-blue-800',
  Repository: 'bg-green-100 text-green-800',
  Deployment: 'bg-orange-100 text-orange-800',
  RuntimeService: 'bg-purple-100 text-purple-800',
  Team: 'bg-teal-100 text-teal-800',
  Person: 'bg-gray-100 text-gray-800',
  Pipeline: 'bg-yellow-100 text-yellow-800',
  Monitor: 'bg-red-100 text-red-800',
};

export function SearchDialog() {
  const router = useRouter();
  const { searchOpen, setSearchOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: results = [] } = useSearch(query);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    if (!searchOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [searchOpen]);

  const handleSelect = useCallback(
    (id: string) => {
      setSearchOpen(false);
      router.push(`/explore?focus=${id}`);
    },
    [router, setSearchOpen]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        handleSelect(results[selectedIndex].id);
      }
    },
    [results, selectedIndex, handleSelect]
  );

  if (!searchOpen) return null;

  const grouped = results.reduce<Record<string, typeof results>>((acc, r) => {
    (acc[r.label] ??= []).push(r);
    return acc;
  }, {});

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50" onClick={() => setSearchOpen(false)} />
      <div className="relative z-50 w-full max-w-lg rounded-lg border bg-background shadow-2xl">
        <div className="flex items-center border-b px-4">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search entities by name, type, or ID..."
            className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => setSearchOpen(false)} className="ml-2 rounded-sm p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        {query.length >= 2 && (
          <div className="max-h-[300px] overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No results found.</p>
            ) : (
              Object.entries(grouped).map(([label, items]) => (
                <div key={label} className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                    {label}
                  </div>
                  {items.map((item) => {
                    const currentIndex = flatIndex++;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-left ${
                          currentIndex === selectedIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <span className="flex-1 font-medium">{item.name}</span>
                        <Badge
                          variant="outline"
                          className={labelColors[item.label] || 'bg-gray-100 text-gray-800'}
                        >
                          {item.label}
                        </Badge>
                        {item.owner && (
                          <span className="text-xs text-muted-foreground">{item.owner}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {query.length < 2 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
}
