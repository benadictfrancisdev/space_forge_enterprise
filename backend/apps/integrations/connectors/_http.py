"""Shared HTTP helpers for REST-style connectors."""
from __future__ import annotations

import base64
import json
from typing import Any
from urllib.parse import urlencode, urlparse, urlunparse

import httpx

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._files import rows_to_schema
from apps.integrations.domain.schema import DiscoveredSchema


def parse_headers(value: Any) -> dict[str, str]:
    if not value:
        return {}
    if isinstance(value, dict):
        return {str(k): str(v) for k, v in value.items()}
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return {}
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValidationError("headers must be valid JSON object") from exc
        if not isinstance(parsed, dict):
            raise ValidationError("headers must be a JSON object")
        return {str(k): str(v) for k, v in parsed.items()}
    raise ValidationError("headers must be a JSON object or string")


def json_path_key(config: dict[str, Any]) -> str:
    return str(config.get("json_path") or config.get("jsonPath") or "").strip()


def navigate_json_path(data: Any, path: str) -> list[dict[str, Any]]:
    current = data
    if path:
        for part in path.split("."):
            if part == "":
                continue
            if not isinstance(current, dict):
                raise ValidationError(f"json_path segment '{part}' is not reachable")
            current = current.get(part)
    if isinstance(current, list):
        rows = current
    elif isinstance(current, dict):
        rows = [current]
    else:
        raise ValidationError("json_path must resolve to a JSON array or object")

    normalized: list[dict[str, Any]] = []
    for item in rows:
        if not isinstance(item, dict):
            normalized.append({"value": item})
        else:
            normalized.append(flatten_record(item))
    return normalized


def flatten_record(record: dict[str, Any]) -> dict[str, Any]:
    flat: dict[str, Any] = {}
    for key, value in record.items():
        if isinstance(value, dict):
            for nested_key, nested_value in value.items():
                flat[f"{key}_{nested_key}"] = nested_value
        elif isinstance(value, list):
            flat[key] = json.dumps(value, separators=(",", ":"))
        else:
            flat[key] = value
    return flat


def build_auth_headers(
    config: dict[str, Any],
    credentials: dict[str, Any],
) -> dict[str, str]:
    headers: dict[str, str] = {}
    api_key = (
        credentials.get("api_key")
        or credentials.get("apiKey")
        or credentials.get("token")
        or credentials.get("bearer_token")
    )
    if api_key:
        auth_style = str(config.get("auth_style") or "bearer").lower()
        if auth_style == "header":
            header_name = str(config.get("auth_header_name") or "X-API-Key")
            headers[header_name] = str(api_key)
        else:
            prefix = str(config.get("auth_prefix") or "Bearer").strip()
            headers["Authorization"] = f"{prefix} {api_key}".strip()

    username = credentials.get("username")
    password = credentials.get("password")
    if username and password:
        token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
        headers["Authorization"] = f"Basic {token}"
    return headers


def merge_url_query(url: str, params: dict[str, Any]) -> str:
    if not params:
        return url
    parsed = urlparse(url)
    existing = parsed.query
    extra = urlencode({k: v for k, v in params.items() if v is not None})
    query = f"{existing}&{extra}" if existing else extra
    return urlunparse(parsed._replace(query=query))


def load_inline_json(config: dict[str, Any]) -> Any:
    inline = config.get("inline_json")
    if inline is None:
        return None
    if isinstance(inline, (dict, list)):
        return inline
    text = str(inline).strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValidationError("inline_json must be valid JSON") from exc


def request_json(
    *,
    config: dict[str, Any],
    credentials: dict[str, Any],
    query_params: dict[str, Any] | None = None,
    timeout: float = 30.0,
) -> Any:
    inline = load_inline_json(config)
    if inline is not None:
        return inline

    url = str(config.get("url") or "").strip()
    if not url:
        raise ValidationError("url (or inline_json) is required")

    method = str(config.get("method") or "GET").upper()
    headers = parse_headers(config.get("headers"))
    headers.update(build_auth_headers(config, credentials))

    body = config.get("body")
    json_body = None
    content = None
    if body not in (None, ""):
        if isinstance(body, dict):
            json_body = body
        else:
            text = str(body).strip()
            if text:
                try:
                    json_body = json.loads(text)
                except json.JSONDecodeError:
                    content = text

    request_url = merge_url_query(url, query_params or {})
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            response = client.request(
                method,
                request_url,
                headers=headers,
                json=json_body,
                content=content,
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        raise ValidationError(
            f"HTTP {exc.response.status_code}: {exc.response.text[:200]}"
        ) from exc
    except httpx.HTTPError as exc:
        raise ValidationError(f"HTTP request failed: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise ValidationError("Response is not valid JSON") from exc


def rows_to_discovered_schema(
    *,
    table_name: str,
    rows: list[dict[str, Any]],
) -> DiscoveredSchema:
    if not rows:
        headers: list[str] = []
    else:
        headers = list(rows[0].keys())
    return rows_to_schema(
        table_name=table_name,
        headers=headers,
        sample_rows=rows[:50],
        row_estimate=len(rows),
    )
