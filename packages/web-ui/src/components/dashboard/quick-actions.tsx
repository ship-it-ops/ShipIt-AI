'use client';

import Link from 'next/link';
import { Plus, Network, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';

export function QuickActions() {
  const { setSearchOpen } = useUIStore();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link href="/connectors">
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Connector
          </Button>
        </Link>
        <Link href="/explore">
          <Button variant="outline" size="sm" className="gap-2">
            <Network className="h-4 w-4" />
            Explore Graph
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
          Search Entities
        </Button>
      </CardContent>
    </Card>
  );
}
