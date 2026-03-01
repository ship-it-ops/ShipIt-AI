export interface LinkingKeyIndex {
  lookupByLinkingKey(linkingKey: string): Promise<string | null>;
  hasCanonicalId(canonicalId: string): Promise<boolean>;
  register(canonicalId: string, linkingKey: string): Promise<void>;
  registerAlias(canonicalId: string, oldLinkingKey: string, newLinkingKey: string): Promise<void>;
}

/**
 * In-memory linking key index for unit testing and simple deployments.
 * Production uses Neo4j-backed index (see neo4j/queries.ts).
 */
export class InMemoryLinkingKeyIndex implements LinkingKeyIndex {
  private readonly linkingKeyToCanonical = new Map<string, string>();
  private readonly canonicalIds = new Set<string>();

  async lookupByLinkingKey(linkingKey: string): Promise<string | null> {
    return this.linkingKeyToCanonical.get(linkingKey) ?? null;
  }

  async hasCanonicalId(canonicalId: string): Promise<boolean> {
    return this.canonicalIds.has(canonicalId);
  }

  async register(canonicalId: string, linkingKey: string): Promise<void> {
    this.canonicalIds.add(canonicalId);
    if (linkingKey) {
      this.linkingKeyToCanonical.set(linkingKey, canonicalId);
    }
  }

  async registerAlias(
    canonicalId: string,
    oldLinkingKey: string,
    newLinkingKey: string,
  ): Promise<void> {
    // Keep old key as alias, point new key to the same canonical ID
    this.linkingKeyToCanonical.set(newLinkingKey, canonicalId);
    // Old key continues to point to same canonical ID (alias)
    this.linkingKeyToCanonical.set(oldLinkingKey, canonicalId);
  }

  // For testing
  clear(): void {
    this.linkingKeyToCanonical.clear();
    this.canonicalIds.clear();
  }
}
