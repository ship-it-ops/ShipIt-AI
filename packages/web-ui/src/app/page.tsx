'use client';

import { GraphHealth } from '@/components/dashboard/graph-health';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { GettingStarted } from '@/components/dashboard/getting-started';

export default function HomePage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Your software ecosystem at a glance
        </p>
      </div>

      <StatsCards />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <GraphHealth />
          <QuickActions />
        </div>
        <div className="space-y-6">
          <ActivityFeed />
          <GettingStarted />
        </div>
      </div>
    </div>
  );
}
