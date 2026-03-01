'use client';

import { Activity, Database, GitBranch, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGraphStats } from '@/lib/hooks/use-graph-stats';

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function GraphHealth() {
  const { data: stats } = useGraphStats();

  if (!stats) return null;

  const healthColor =
    stats.healthScore >= 90
      ? 'text-emerald-500'
      : stats.healthScore >= 70
      ? 'text-amber-500'
      : 'text-red-500';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-blue-500" />
          Graph Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className={`text-3xl font-bold ${healthColor}`}>{stats.healthScore}%</div>
            <div className="text-xs text-muted-foreground">Health Score</div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Database className="h-3.5 w-3.5" />
                Nodes
              </span>
              <span className="font-medium">{stats.nodeCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5" />
                Edges
              </span>
              <span className="font-medium">{stats.edgeCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Staleness
              </span>
              <span className="font-medium">{stats.staleness}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Sync</span>
              <span className="font-medium">{formatRelativeTime(stats.lastSync)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
