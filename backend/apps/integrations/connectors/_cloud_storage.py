"""Shared helpers for cloud object storage connectors (S3, MinIO, …)."""
from __future__ import annotations

import io
import json
from typing import Any

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._files import as_bool, load_bytes, parse_csv_rows
from apps.integrations.connectors._http import flatten_record, json_path_key, navigate_json_path


def resolve_s3_settings(
    config: dict[str, Any],
    credentials: dict[str, Any],
) -> dict[str, Any]:
    bucket = str(config.get("bucket") or "").strip()
    key = str(config.get("key") or config.get("object_key") or "").strip()
    if not bucket and not config.get("inline_text") and not config.get("inline_b64"):
        raise ValidationError("bucket is required")
    if not key and not config.get("inline_text") and not config.get("inline_b64"):
        raise ValidationError("key (object path) is required")

    access_key = (
        credentials.get("accessKey")
        or credentials.get("access_key")
        or credentials.get("access_key_id")
        or config.get("accessKey")
    )
    secret_key = (
        credentials.get("secretKey")
        or credentials.get("secret_key")
        or credentials.get("secret_access_key")
        or config.get("secretKey")
    )
    return {
        "bucket": bucket,
        "key": key,
        "region": str(config.get("region") or "us-east-1"),
        "endpoint_url": config.get("endpoint_url") or config.get("endpoint"),
        "access_key": str(access_key) if access_key else None,
        "secret_key": str(secret_key) if secret_key else None,
    }


def build_s3_client(settings: dict[str, Any]):
    kwargs: dict[str, Any] = {
        "service_name": "s3",
        "region_name": settings["region"],
        "config": Config(signature_version="s3v4"),
    }
    if settings.get("endpoint_url"):
        kwargs["endpoint_url"] = settings["endpoint_url"]
    if settings.get("access_key") and settings.get("secret_key"):
        kwargs["aws_access_key_id"] = settings["access_key"]
        kwargs["aws_secret_access_key"] = settings["secret_key"]
    return boto3.client(**kwargs)


def download_s3_object_bytes(
    *,
    config: dict[str, Any],
    credentials: dict[str, Any],
) -> bytes:
    if config.get("inline_text") is not None or config.get("inline_b64"):
        return load_bytes(config=config, credentials=credentials)

    settings = resolve_s3_settings(config, credentials)
    client = build_s3_client(settings)
    try:
        response = client.get_object(Bucket=settings["bucket"], Key=settings["key"])
        return response["Body"].read()
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "S3Error")
        raise ValidationError(f"S3 download failed ({code}): {settings['key']}") from exc


def head_s3_object(
    *,
    config: dict[str, Any],
    credentials: dict[str, Any],
) -> dict[str, Any]:
    settings = resolve_s3_settings(config, credentials)
    client = build_s3_client(settings)
    try:
        return client.head_object(Bucket=settings["bucket"], Key=settings["key"])
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "S3Error")
        raise ValidationError(f"S3 object not found ({code}): {settings['key']}") from exc


def detect_file_type(config: dict[str, Any]) -> str:
    explicit = str(config.get("fileType") or config.get("file_type") or "").strip().lower()
    if explicit:
        return explicit
    key = str(config.get("key") or config.get("object_key") or "").lower()
    if key.endswith(".jsonl") or key.endswith(".ndjson"):
        return "jsonl"
    if key.endswith(".json"):
        return "json"
    if key.endswith(".csv") or key.endswith(".tsv"):
        return "csv"
    return "csv"


def parse_object_rows(
    raw: bytes,
    *,
    config: dict[str, Any],
) -> tuple[list[str], list[dict[str, Any]]]:
    file_type = detect_file_type(config)
    encoding = str(config.get("encoding") or "utf-8")

    if file_type == "csv":
        delimiter = str(config.get("delimiter") or ",")
        if str(config.get("key") or "").lower().endswith(".tsv"):
            delimiter = "\t"
        has_header = as_bool(config.get("has_header"), True)
        if len(delimiter) != 1:
            raise ValidationError("delimiter must be a single character")
        return parse_csv_rows(
            raw,
            encoding=encoding,
            delimiter=delimiter,
            has_header=has_header,
        )

    if file_type == "jsonl":
        rows: list[dict[str, Any]] = []
        text = raw.decode(encoding, errors="replace")
        for line_no, line in enumerate(text.splitlines(), start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                item = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValidationError(f"Invalid JSONL on line {line_no}") from exc
            if isinstance(item, dict):
                rows.append(flatten_record(item))
            else:
                rows.append({"value": item})
        headers = list(rows[0].keys()) if rows else []
        return headers, rows

    if file_type == "json":
        try:
            payload = json.loads(raw.decode(encoding, errors="replace"))
        except json.JSONDecodeError as exc:
            raise ValidationError("Invalid JSON object") from exc
        rows = navigate_json_path(payload, json_path_key(config))
        headers = list(rows[0].keys()) if rows else []
        return headers, rows

    raise ValidationError(f"Unsupported file type: {file_type}")
