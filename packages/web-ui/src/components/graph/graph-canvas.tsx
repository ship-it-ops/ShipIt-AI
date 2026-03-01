'use client';

import { useEffect, useRef, useCallback } from 'react';
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import type { GraphData } from '@/lib/api';
import { useGraphStore } from '@/stores/graph-store';

const nodeColors: Record<string, { bg: string; border: string }> = {
  LogicalService: { bg: '#3b82f6', border: '#2563eb' },
  Repository: { bg: '#22c55e', border: '#16a34a' },
  Deployment: { bg: '#f97316', border: '#ea580c' },
  RuntimeService: { bg: '#a855f7', border: '#9333ea' },
  Team: { bg: '#14b8a6', border: '#0d9488' },
  Person: { bg: '#6b7280', border: '#4b5563' },
  Pipeline: { bg: '#eab308', border: '#ca8a04' },
  Monitor: { bg: '#ef4444', border: '#dc2626' },
};

const nodeShapes: Record<string, string> = {
  LogicalService: 'ellipse',
  Repository: 'round-rectangle',
  Deployment: 'hexagon',
  RuntimeService: 'diamond',
  Team: 'ellipse',
  Person: 'ellipse',
  Pipeline: 'round-rectangle',
  Monitor: 'triangle',
};

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick?: (nodeId: string) => void;
}

export function GraphCanvas({ data, onNodeClick }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const { layout, filters } = useGraphStore();

  const getLayoutConfig = useCallback(() => {
    switch (layout) {
      case 'dagre':
        return { name: 'breadthfirst', directed: true, spacingFactor: 1.5, padding: 50 };
      case 'cose':
        return { name: 'cose', idealEdgeLength: 100, nodeOverlap: 20, padding: 50, animate: false };
      case 'concentric':
        return { name: 'concentric', minNodeSpacing: 60, padding: 50 };
      default:
        return { name: 'breadthfirst', directed: true, spacingFactor: 1.5, padding: 50 };
    }
  }, [layout]);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements: ElementDefinition[] = [
      ...data.nodes.map((n) => ({
        data: n.data,
        group: 'nodes' as const,
      })),
      ...data.edges.map((e) => ({
        data: e.data,
        group: 'edges' as const,
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(name)',
            'text-valign': 'bottom',
            'text-margin-y': 8,
            'font-size': '11px',
            color: '#374151',
            'text-max-width': '100px',
            'text-wrap': 'ellipsis',
            width: 40,
            height: 40,
            'background-color': '#6b7280',
            'border-width': 2,
            'border-color': '#4b5563',
          },
        },
        ...Object.entries(nodeColors).map(([type, colors]) => ({
          selector: `node[type="${type}"]`,
          style: {
            'background-color': colors.bg,
            'border-color': colors.border,
            shape: (nodeShapes[type] || 'ellipse') as cytoscape.Css.NodeShape,
          },
        })),
        {
          selector: 'node[type="Person"]',
          style: { width: 28, height: 28, 'font-size': '9px' },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#d1d5db',
            'target-arrow-color': '#d1d5db',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(type)',
            'font-size': '8px',
            color: '#9ca3af',
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#2563eb',
            'overlay-opacity': 0.1,
            'overlay-color': '#3b82f6',
          },
        },
        {
          selector: '.hidden',
          style: { display: 'none' },
        },
      ],
      layout: getLayoutConfig(),
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cy.on('tap', 'node', (evt) => {
      const nodeId = evt.target.id();
      onNodeClick?.(nodeId);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [data, getLayoutConfig, onNodeClick]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().forEach((node) => {
      const nodeData = node.data();
      let visible = true;

      if (filters.nodeLabels.length > 0 && !filters.nodeLabels.includes(nodeData.type)) {
        visible = false;
      }
      if (filters.environments.length > 0 && nodeData.environment && !filters.environments.includes(nodeData.environment)) {
        visible = false;
      }
      if (filters.tiers.length > 0 && nodeData.tier && !filters.tiers.includes(String(nodeData.tier))) {
        visible = false;
      }
      if (filters.owners.length > 0 && nodeData.owner && !filters.owners.includes(nodeData.owner)) {
        visible = false;
      }

      if (visible) {
        node.removeClass('hidden');
      } else {
        node.addClass('hidden');
      }
    });

    cy.edges().forEach((edge) => {
      const source = edge.source();
      const target = edge.target();
      if (source.hasClass('hidden') || target.hasClass('hidden')) {
        edge.addClass('hidden');
      } else {
        edge.removeClass('hidden');
      }
    });
  }, [filters]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.layout(getLayoutConfig()).run();
  }, [layout, getLayoutConfig]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-gray-50 rounded-lg border"
    />
  );
}
