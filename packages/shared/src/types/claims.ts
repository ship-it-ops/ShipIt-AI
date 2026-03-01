export interface PropertyClaim {
  property_key: string;
  value: unknown;
  source: string;
  source_id: string;
  ingested_at: string; // ISO 8601
  confidence: number; // 0.0-1.0
  evidence: string | null;
}

export type ResolutionStrategy =
  | 'MANUAL_OVERRIDE_FIRST'
  | 'HIGHEST_CONFIDENCE'
  | 'AUTHORITATIVE_ORDER'
  | 'LATEST_TIMESTAMP'
  | 'MERGE_SET';

export interface EdgeClaim {
  source: string;
  confidence: number;
  ingested_at: string;
  retracted: boolean;
  retracted_at?: string;
}

export interface ClaimResolutionResult {
  effective_value: unknown;
  winning_claim: PropertyClaim;
  strategy: ResolutionStrategy;
  all_claims: PropertyClaim[];
}
