'use client';

import { RefreshCw, GitMerge, Settings, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mockActivity } from '@/lib/mock-data';
import type { ActivityEvent } from '@/lib/api';

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const eventIcons: Record<ActivityEvent['type'], React.ReactNode> = {
  sync: <RefreshCw className="h-3.5 w-3.5 text-blue-500" />,
  merge: <GitMerge className="h-3.5 w-3.5 text-purple-500" />,
  schema_change: <Settings className="h-3.5 w-3.5 text-amber-500" />,
  connector_added: <Plus className="h-3.5 w-3.5 text-emerald-500" />,
};

export function ActivityFeed() {
  const events = mockActivity;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px] px-6 pb-4">
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  {eventIcons[event.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{event.message}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(event.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
