import type { ResolutionStrategy } from './claims.js';

export type SchemaMode = 'full' | 'simple';

export interface SchemaPropertyDef {
  type: string; // 'string', 'integer', 'boolean', 'string[]'
  required?: boolean;
  resolution_strategy: ResolutionStrategy;
  enum?: string[];
  description?: string;
}

export interface SchemaNodeTypeDef {
  description: string;
  properties: Record<string, SchemaPropertyDef>;
  constraints?: {
    unique_key?: string;
  };
}

export interface SchemaRelTypeDef {
  from: string;
  to: string;
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:M';
  properties?: Record<string, SchemaPropertyDef>;
  description?: string;
}

export interface ShipItSchema {
  version: string;
  mode: SchemaMode;
  node_types: Record<string, SchemaNodeTypeDef>;
  relationship_types: Record<string, SchemaRelTypeDef>;
  resolution_defaults?: Record<string, ResolutionStrategy>;
}
