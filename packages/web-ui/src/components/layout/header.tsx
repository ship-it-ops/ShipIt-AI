'use client';

import { usePathname } from 'next/navigation';
import { Search, ChevronRight } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';

const routeNames: Record<string, string> = {
  '/': 'Home',
  '/explore': 'Graph Explorer',
  '/connectors': 'Connector Hub',
  '/incidents': 'Incident Mode',
};

function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0) {
    return <span className="text-sm font-medium">Home</span>;
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-muted-foreground">Home</span>
      {parts.map((part, i) => {
        const path = '/' + parts.slice(0, i + 1).join('/');
        const name = routeNames[path] || part.charAt(0).toUpperCase() + part.slice(1);
        return (
          <span key={path} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className={i === parts.length - 1 ? 'font-medium' : 'text-muted-foreground'}>
              {name}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function Header() {
  const { setSearchOpen } = useUIStore();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <Breadcrumbs />

      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
    </header>
  );
}
