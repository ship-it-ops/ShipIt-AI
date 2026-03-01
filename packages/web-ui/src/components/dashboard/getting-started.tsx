'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, Plug, Network, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConnectors } from '@/lib/hooks/use-connectors';

interface ChecklistItem {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  completed: boolean;
}

export function GettingStarted() {
  const { data: connectors = [] } = useConnectors();
  const connectedCount = connectors.filter((c) => c.status !== 'not_connected').length;

  if (connectedCount >= 3) return null;

  const items: ChecklistItem[] = [
    {
      label: 'Connect your first data source',
      description: 'Add a connector like GitHub to start populating the graph',
      href: '/connectors',
      icon: <Plug className="h-4 w-4" />,
      completed: connectedCount >= 1,
    },
    {
      label: 'Explore the knowledge graph',
      description: 'Navigate your software ecosystem visually',
      href: '/explore',
      icon: <Network className="h-4 w-4" />,
      completed: false,
    },
    {
      label: 'Add a second connector',
      description: 'Cross-reference data from multiple sources',
      href: '/connectors',
      icon: <Search className="h-4 w-4" />,
      completed: connectedCount >= 2,
    },
  ];

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Getting Started</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-blue-100/50"
            >
              {item.completed ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
