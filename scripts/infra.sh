#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Starting Neo4j and Redis..."
docker compose -f "$ROOT_DIR/docker/docker-compose.yml" up -d neo4j redis

echo "Waiting for services to be healthy..."

MAX_WAIT=120
ELAPSED=0
INTERVAL=5

while (( ELAPSED < MAX_WAIT )); do
  NEO4J_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$(docker compose -f "$ROOT_DIR/docker/docker-compose.yml" ps -q neo4j)" 2>/dev/null || echo "waiting")
  REDIS_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$(docker compose -f "$ROOT_DIR/docker/docker-compose.yml" ps -q redis)" 2>/dev/null || echo "waiting")

  if [[ "$NEO4J_HEALTH" == "healthy" && "$REDIS_HEALTH" == "healthy" ]]; then
    echo "Neo4j: healthy"
    echo "Redis: healthy"
    echo "Infrastructure ready!"
    exit 0
  fi

  echo "  neo4j=$NEO4J_HEALTH  redis=$REDIS_HEALTH  (${ELAPSED}s/${MAX_WAIT}s)"
  sleep "$INTERVAL"
  ELAPSED=$(( ELAPSED + INTERVAL ))
done

echo "ERROR: Services did not become healthy within ${MAX_WAIT}s"
exit 1
