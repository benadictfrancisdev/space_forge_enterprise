/**
 * Architecture notes — SpaceForge Enterprise V2
 *
 * Sprint 1 baseline (LOCKED — Track 1 audit):
 *   Frontend → Platform Contracts → REST Adapters
 *     → Django REST (domain / tenancy / pipeline orchestration)
 *       → PostgreSQL · Redis · S3/MinIO · Celery
 *       → FastAPI AI Service (compute only)
 *
 * Audit artifact: docs/sprint-1/TRACK-1-ARCHITECTURE-AUDIT.md
 * Ownership map: docs/sprint-1/TRACK-1.5-DOMAIN-OWNERSHIP-MAP.md
 * API matrix: docs/sprint-1/TRACK-1.5-API-OWNERSHIP-MATRIX.md
 * Track 5: docs/sprint-1/TRACK-5-FASTAPI-AI-COMPUTE.md
 * MongoDB: out of scope. Stubs replaced per-endpoint, not deleted en masse.
 */
export {};
