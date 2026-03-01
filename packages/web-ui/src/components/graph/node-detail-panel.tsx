'use client';

import { X, ExternalLink, Search, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { GraphData } from '@/lib/api';

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

interface NodeDetailPanelProps {
  nodeId: string;
  graphData: GraphData;
  onClose: () => void;
}

export function NodeDetailPanel({ nodeId, graphData, onClose }: NodeDetailPanelProps) {
  const node = graphData.nodes.find((n) => n.data.id === nodeId);
  if (!node) return null;

  const { name, type, tier, owner, environment, ...rest } = node.data;

  const connectedEdges = graphData.edges.filter(
    (e) => e.data.source === nodeId || e.data.target === nodeId
  );

  return (
    <div className="w-80 shrink-0 overflow-y-auto border-l bg-background">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold truncate">{name}</h3>
        <button onClick={onClose} className="rounded-sm p-1 hover:bg-accent">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          <Badge className={labelColors[type] || 'bg-gray-100 text-gray-800'}>{type}</Badge>
          {tier && <Badge variant="outline">Tier {tier}</Badge>}
          {environment && <Badge variant="secondary">{environment}</Badge>}
        </div>

        {owner && (
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Owner</div>
            <div className="text-sm">{owner}</div>
          </div>
        )}

        <Separator />

        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Connections ({connectedEdges.length})
          </div>
          <div className="space-y-1">
            {connectedEdges.slice(0, 10).map((edge) => {
              const targetId = edge.data.source === nodeId ? edge.data.target : edge.data.source;
              const targetNode = graphData.nodes.find((n) => n.data.id === targetId);
              const direction = edge.data.source === nodeId ? '->' : '<-';
              return (
                <div key={edge.data.id} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{direction}</span>
                  <span className="font-mono text-muted-foreground">{edge.data.type}</span>
                  <span className="truncate">{targetNode?.data.name ?? targetId}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full gap-2">
            <ExternalLink className="h-3.5 w-3.5" />
            View Details
          </Button>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Search className="h-3.5 w-3.5" />
            Inspect Claims
          </Button>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Target className="h-3.5 w-3.5" />
            Show Blast Radius
          </Button>
        </div>
      </div>
    </div>
  );
}
