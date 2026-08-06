"""
SpaceForge AI Compute Service (FastAPI) — Sprint 1 Track 5 / Level 2.

Compute only. Gateway → Model Router → Operation Registry.
"""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from ai_service.gateway import list_operations, list_providers, run_gateway

app = FastAPI(
    title="SpaceForge AI Compute",
    version="0.5.1",
    description="Track 5 Level 2 — Gateway, Model Router, Operation Registry, Evaluation.",
)


class ComputeRequest(BaseModel):
    dataset_id: str | None = None
    organization_id: str | None = None
    profile: dict[str, Any] = Field(default_factory=dict)
    params: dict[str, Any] = Field(default_factory=dict)
    question: str | None = None
    message: str | None = None
    query: str | None = None
    hypothesis: str | None = None
    target_column: str | None = None
    horizon: int | None = None
    module: str | None = None
    # Internal only (Django may set); never accepted from browser as a product API
    preferred_provider: str | None = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "spaceforge-ai",
        "version": "0.5.1",
        "operations": list_operations(),
        "providers": list_providers(),
    }


@app.post("/v1/compute/{operation}")
def compute(operation: str, body: ComputeRequest):
    payload = body.model_dump()
    preferred = payload.pop("preferred_provider", None)
    params = dict(payload.pop("params") or {})
    payload.update(params)
    try:
        return run_gateway(operation, payload, preferred_provider=preferred)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/v1/operations")
def operations():
    return {"operations": list_operations()}


@app.get("/v1/providers")
def providers():
    """Internal ops visibility — not for React product UI."""
    return {"providers": list_providers()}
