'use client';

import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useGraphStore, type GraphFilters } from '@/stores/graph-store';

const nodeLabels = [
  'LogicalService',
  'Repository',
  'Deployment',
  'RuntimeService',
  'Team',
  'Person',
  'Pipeline',
  'Monitor',
];

const environments = ['production', 'staging', 'dev'];
const tiers = ['1', '2', '3'];
const owners = ['payments-team', 'platform-team', 'identity-team', 'sre-team', 'comms-team'];

interface FilterGroupProps {
  title: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function FilterGroup({ title, options, selected, onChange }: FilterGroupProps) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1">
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
              className="h-3.5 w-3.5 rounded border-gray-300"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
}

export function FilterPanel({ open, onClose }: FilterPanelProps) {
  const { filters, setFilters, resetFilters } = useGraphStore();

  if (!open) return null;

  const hasFilters =
    filters.nodeLabels.length > 0 ||
    filters.environments.length > 0 ||
    filters.tiers.length > 0 ||
    filters.owners.length > 0;

  return (
    <Card className="w-64 shrink-0 overflow-y-auto border-r rounded-none border-t-0 border-b-0 border-l-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4" />
          Filters
        </CardTitle>
        <button onClick={onClose} className="rounded-sm p-1 hover:bg-accent">
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="w-full text-xs">
            Clear All Filters
          </Button>
        )}

        <FilterGroup
          title="Node Labels"
          options={nodeLabels}
          selected={filters.nodeLabels}
          onChange={(nodeLabels) => setFilters({ nodeLabels })}
        />

        <Separator />

        <FilterGroup
          title="Environment"
          options={environments}
          selected={filters.environments}
          onChange={(environments) => setFilters({ environments })}
        />

        <Separator />

        <FilterGroup
          title="Tier"
          options={tiers}
          selected={filters.tiers}
          onChange={(tiers) => setFilters({ tiers })}
        />

        <Separator />

        <FilterGroup
          title="Owner"
          options={owners}
          selected={filters.owners}
          onChange={(owners) => setFilters({ owners })}
        />
      </CardContent>
    </Card>
  );
}
