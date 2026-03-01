'use client';

import { Github, Container, BarChart3, BookOpen, Ticket, UserCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ConnectorInfo } from '@/lib/api';

const connectorIcons: Record<string, React.ReactNode> = {
  github: <Github className="h-6 w-6" />,
  kubernetes: <Container className="h-6 w-6" />,
  datadog: <BarChart3 className="h-6 w-6" />,
  backstage: <BookOpen className="h-6 w-6" />,
  jira: <Ticket className="h-6 w-6" />,
  identity: <UserCircle className="h-6 w-6" />,
};

const statusConfig: Record<string, { color: string; dot: string; label: string }> = {
  healthy: { color: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Healthy' },
  degraded: { color: 'text-amber-700', dot: 'bg-amber-500', label: 'Degraded' },
  failed: { color: 'text-red-700', dot: 'bg-red-500', label: 'Failed' },
  not_connected: { color: 'text-gray-500', dot: 'bg-gray-400', label: 'Not Connected' },
};

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'Never';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface ConnectorCardProps {
  connector: ConnectorInfo;
  onClick: () => void;
}

export function ConnectorCard({ connector, onClick }: ConnectorCardProps) {
  const status = statusConfig[connector.status] || statusConfig.not_connected;
  const icon = connectorIcons[connector.type] || <BookOpen className="h-6 w-6" />;

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{connector.name}</h3>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span>Last sync: {formatRelativeTime(connector.lastSync)}</span>
              <span>{connector.entityCount} entities</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
