'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Network,
  Plug,
  Siren,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      { label: 'Home', href: '/', icon: <Home className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Explore',
    items: [
      { label: 'Graph Explorer', href: '/explore', icon: <Network className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Configure',
    items: [
      { label: 'Connector Hub', href: '/connectors', icon: <Plug className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Incident Mode', href: '/incidents', icon: <Siren className="h-4 w-4" /> },
    ],
  },
];

function NavGroupSection({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const hasGroupLabel = group.label.length > 0;

  return (
    <div className="mb-1">
      {hasGroupLabel && !collapsed && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--sidebar-muted))] hover:text-[hsl(var(--sidebar-foreground))]"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {group.label}
        </button>
      )}
      {(expanded || collapsed || !hasGroupLabel) && (
        <div className="space-y-0.5">
          {group.items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]'
                    : 'text-[hsl(var(--sidebar-muted))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-[hsl(var(--sidebar))] transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className={cn('flex items-center gap-2 border-b border-[hsl(var(--sidebar-accent))] p-4', sidebarCollapsed && 'justify-center px-2')}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
          S
        </div>
        {!sidebarCollapsed && (
          <span className="text-lg font-bold text-[hsl(var(--sidebar-foreground))]">
            ShipIt-AI
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {navGroups.map((group, i) => (
          <NavGroupSection key={i} group={group} collapsed={sidebarCollapsed} />
        ))}
      </nav>

      <div className="border-t border-[hsl(var(--sidebar-accent))] p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-md p-2 text-[hsl(var(--sidebar-muted))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
