'use client';

import { useState, useCallback } from 'react';
import { Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraphCanvas } from '@/components/graph/graph-canvas';
import { GraphControls } from '@/components/graph/graph-controls';
import { FilterPanel } from '@/components/graph/filter-panel';
import { NodeDetailPanel } from '@/components/graph/node-detail-panel';
import { useGraphStore } from '@/stores/graph-store';
import { mockGraphData } from '@/lib/mock-data';

export default function GraphExplorerPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedNode, setSelectedNode } = useGraphStore();

  const graphData = mockGraphData;

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(nodeId);
    },
    [setSelectedNode]
  );

  return (
    <div className="flex h-full">
      <FilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} />

      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Button
            variant={filterOpen ? 'secondary' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="ml-auto">
            <GraphControls />
          </div>
        </div>

        <div className="relative flex-1">
          <GraphCanvas data={graphData} onNodeClick={handleNodeClick} />
        </div>
      </div>

      {selectedNode && (
        <NodeDetailPanel
          nodeId={selectedNode}
          graphData={graphData}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
