'use client';

import { Server, GitFork, Rocket, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGraphStats } from '@/lib/hooks/use-graph-stats';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCards() {
  const { data: stats } = useGraphStats();

  if (!stats) return null;

  const cards: StatCardProps[] = [
    {
      label: 'Services',
      value: (stats.nodesByLabel.LogicalService ?? 0) + (stats.nodesByLabel.RuntimeService ?? 0),
      icon: <Server className="h-5 w-5 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      label: 'Repositories',
      value: stats.nodesByLabel.Repository ?? 0,
      icon: <GitFork className="h-5 w-5 text-green-600" />,
      color: 'bg-green-100',
    },
    {
      label: 'Deployments',
      value: stats.nodesByLabel.Deployment ?? 0,
      icon: <Rocket className="h-5 w-5 text-orange-600" />,
      color: 'bg-orange-100',
    },
    {
      label: 'Teams',
      value: stats.nodesByLabel.Team ?? 0,
      icon: <Users className="h-5 w-5 text-teal-600" />,
      color: 'bg-teal-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
