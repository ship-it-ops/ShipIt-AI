// Unique constraints for canonical IDs
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT logical_service_id IF NOT EXISTS FOR (n:LogicalService) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT repository_id IF NOT EXISTS FOR (n:Repository) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT deployment_id IF NOT EXISTS FOR (n:Deployment) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT runtime_service_id IF NOT EXISTS FOR (n:RuntimeService) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT team_id IF NOT EXISTS FOR (n:Team) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT person_id IF NOT EXISTS FOR (n:Person) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT pipeline_id IF NOT EXISTS FOR (n:Pipeline) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT monitor_id IF NOT EXISTS FOR (n:Monitor) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT namespace_id IF NOT EXISTS FOR (n:Namespace) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT cluster_id IF NOT EXISTS FOR (n:Cluster) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT build_artifact_id IF NOT EXISTS FOR (n:BuildArtifact) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT environment_id IF NOT EXISTS FOR (n:Environment) REQUIRE n.id IS UNIQUE;

// Indexes for common queries
CREATE INDEX entity_name IF NOT EXISTS FOR (n:LogicalService) ON (n.name);
CREATE INDEX repo_name IF NOT EXISTS FOR (n:Repository) ON (n.name);
CREATE INDEX deployment_name IF NOT EXISTS FOR (n:Deployment) ON (n.name);
CREATE INDEX team_name IF NOT EXISTS FOR (n:Team) ON (n.name);
CREATE INDEX person_name IF NOT EXISTS FOR (n:Person) ON (n.name);
CREATE INDEX person_email IF NOT EXISTS FOR (n:Person) ON (n.email);

// Indexes for sync/staleness queries
CREATE INDEX last_synced IF NOT EXISTS FOR (n:LogicalService) ON (n._last_synced);
CREATE INDEX source_system IF NOT EXISTS FOR (n:LogicalService) ON (n._source_system);

// Linking key index (Core Writer identity reconciliation)
CREATE CONSTRAINT linking_key IF NOT EXISTS FOR (n:LinkingKey) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT _linking_key IF NOT EXISTS FOR (n:_LinkingKey) REQUIRE n.linking_key IS UNIQUE;

// Idempotency log (Core Writer duplicate detection)
CREATE CONSTRAINT idempotency_key IF NOT EXISTS FOR (n:IdempotencyLog) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT _idempotency_key IF NOT EXISTS FOR (n:_IdempotencyLog) REQUIRE n.key IS UNIQUE;
CREATE INDEX _idempotency_expires IF NOT EXISTS FOR (n:_IdempotencyLog) ON (n.expires_at);

// Schema meta-nodes (ADR-009)
CREATE CONSTRAINT schema_node_type IF NOT EXISTS FOR (n:SchemaNodeType) REQUIRE n.label IS UNIQUE;
CREATE CONSTRAINT schema_rel_type IF NOT EXISTS FOR (n:SchemaRelType) REQUIRE n.type IS UNIQUE;
