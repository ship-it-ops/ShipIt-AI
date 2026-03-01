'use client';

import { ZoomIn, ZoomOut, Maximize, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useGraphStore } from '@/stores/graph-store';

const layouts = [
  { id: 'dagre' as const, label: 'Hierarchical (Dagre)' },
  { id: 'cose' as const, label: 'Force-Directed (CoSE)' },
  { id: 'concentric' as const, label: 'Concentric' },
];

export function GraphControls() {
  const { layout, setLayout } = useGraphStore();

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-sm">
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Zoom In">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Zoom Out">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Fit to Screen">
        <Maximize className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
            <LayoutDashboard className="h-3.5 w-3.5" />
            {layouts.find((l) => l.id === layout)?.label ?? 'Layout'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {layouts.map((l) => (
            <DropdownMenuItem
              key={l.id}
              onClick={() => setLayout(l.id)}
              className={layout === l.id ? 'bg-accent' : ''}
            >
              {l.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
