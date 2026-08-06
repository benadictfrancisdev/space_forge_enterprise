"""mongodb — MongoDB collection connector via pymongo."""
from __future__ import annotations

import json
from typing import Any

from pymongo import MongoClient

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._document import (
    documents_to_schema,
    extract_inline_documents_batch,
    load_inline_documents,
)
from apps.integrations.connectors._http import flatten_record
from apps.integrations.connectors._sql import resolve_db_params, serialize_cell
from apps.integrations.domain.connector import (
    BaseConnector,
    ConnectorCapabilities,
    TestResult,
)
from apps.integrations.domain.schema import DiscoveredSchema
from apps.integrations.domain.sync import ExtractBatch, SyncCursor, SyncMode


class MongoDBConnector(BaseConnector):
    @property
    def connector_type(self) -> str:
        return "mongodb"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def capabilities(self) -> ConnectorCapabilities:
        return ConnectorCapabilities(
            supports_full_sync=True,
            supports_incremental_sync=True,
            supports_schema_discovery=True,
            supports_scheduled_sync=False,
        )

    def get_config_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "host": {"type": "string", "title": "Host"},
                "port": {"type": "integer", "default": 27017, "title": "Port"},
                "database": {"type": "string", "title": "Database"},
                "collection": {"type": "string", "title": "Collection"},
                "filter": {
                    "type": "object",
                    "title": "MongoDB query filter",
                    "description": "JSON object filter passed to find()",
                },
                "incremental_column": {
                    "type": "string",
                    "title": "Incremental cursor field",
                    "default": "_id",
                },
            },
            "required": ["host", "database", "collection"],
            "additionalProperties": True,
        }

    def _collection_name(self, config: dict[str, Any]) -> str:
        name = str(config.get("collection") or config.get("table") or "").strip()
        if not name:
            raise ValidationError("collection is required")
        return name

    def _parse_filter(self, config: dict[str, Any]) -> dict[str, Any]:
        raw = config.get("filter")
        if not raw:
            return {}
        if isinstance(raw, dict):
            return raw
        try:
            parsed = json.loads(str(raw))
        except json.JSONDecodeError as exc:
            raise ValidationError("filter must be valid JSON object") from exc
        if not isinstance(parsed, dict):
            raise ValidationError("filter must be a JSON object")
        return parsed


    def _client(self, config: dict[str, Any], credentials: dict[str, Any]):
        uri = credentials.get("connection_uri") or credentials.get("uri") or config.get("connection_uri")
        if uri:
            return MongoClient(str(uri), serverSelectionTimeoutMS=15000)
        params = resolve_db_params(
            config, credentials, default_port=27017, default_database=""
        )
        if credentials.get("username") or config.get("username"):
            user = str(credentials.get("username") or config.get("username"))
            password = str(credentials.get("password") or config.get("password") or "")
            uri = (
                f"mongodb://{user}:{password}@{params['host']}:{params['port']}/"
                f"{params['dbname']}?authSource=admin"
            )
        else:
            uri = f"mongodb://{params['host']}:{params['port']}/{params['dbname']}"
        return MongoClient(uri, serverSelectionTimeoutMS=15000)

    def _load_documents(
        self,
        config: dict[str, Any],
        credentials: dict[str, Any],
        *,
        skip: int = 0,
        limit: int = 100,
        incremental_field: str | None = None,
        last_value: Any = None,
    ) -> list[dict[str, Any]]:
        inline = load_inline_documents(config)
        if inline is not None:
            return inline[skip : skip + limit]

        client = self._client(config, credentials)
        try:
            db_name = str(config.get("database") or "").strip()
            if not db_name:
                raise ValidationError("database is required")
            collection = client[db_name][self._collection_name(config)]
            query = self._parse_filter(config)
            if incremental_field and last_value is not None:
                query = {**query, incremental_field: {"$gt": last_value}}
            cursor = collection.find(query).skip(skip).limit(limit)
            rows: list[dict[str, Any]] = []
            for doc in cursor:
                flat = flatten_record(doc)
                if "_id" in flat:
                    flat["_id"] = serialize_cell(doc.get("_id"))
                rows.append({k: serialize_cell(v) for k, v in flat.items()})
            return rows
        finally:
            client.close()

    def test_connection(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> TestResult:
        inline = load_inline_documents(config)
        collection = self._collection_name(config)
        if inline is not None:
            return TestResult(
                ok=True,
                message=f"MongoDB inline collection readable ({len(inline)} docs)",
                details={"row_count": len(inline), "collection": collection},
            )
        try:
            client = self._client(config, credentials)
            try:
                client.admin.command("ping")
                db = client[str(config.get("database"))]
                count = db[collection].estimated_document_count()
            finally:
                client.close()
        except ValidationError as exc:
            return TestResult(ok=False, message=str(exc))
        except Exception as exc:  # noqa: BLE001
            return TestResult(ok=False, message=f"MongoDB connection failed: {exc}")
        return TestResult(
            ok=True,
            message=f"MongoDB reachable (~{count} docs in {collection})",
            details={"row_count": int(count), "collection": collection},
        )

    def discover_schema(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> DiscoveredSchema:
        collection = self._collection_name(config)
        inline = load_inline_documents(config)
        if inline is not None:
            return documents_to_schema(collection_name=collection, rows=inline)
        sample = self._load_documents(config, credentials, skip=0, limit=50)
        return documents_to_schema(collection_name=collection, rows=sample)

    def extract(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
        cursor: SyncCursor,
        mode: SyncMode,
        batch_size: int = 100,
    ) -> ExtractBatch:
        if batch_size < 1:
            batch_size = 1
        collection = self._collection_name(config)
        inline = load_inline_documents(config)
        if inline is not None:
            return extract_inline_documents_batch(
                config=config,
                documents=inline,
                cursor=cursor,
                mode=mode,
                batch_size=batch_size,
                collection_name=collection,
            )

        if mode == SyncMode.INCREMENTAL:
            field = str(config.get("incremental_column") or "_id")
            last_value = cursor.state.get("last_value")
            rows = self._load_documents(
                config,
                credentials,
                skip=0,
                limit=batch_size,
                incremental_field=field,
                last_value=last_value,
            )
            next_state: dict[str, Any] = {}
            if rows:
                next_state["last_value"] = rows[-1].get(field)
            return ExtractBatch(
                rows=tuple(rows),
                next_cursor=SyncCursor(state=next_state),
                has_more=len(rows) >= batch_size,
                table_name=collection,
            )

        offset = int(cursor.state.get("offset", 0))
        rows = self._load_documents(config, credentials, skip=offset, limit=batch_size)
        return ExtractBatch(
            rows=tuple(rows),
            next_cursor=SyncCursor(state={"offset": offset + len(rows)}),
            has_more=len(rows) >= batch_size,
            table_name=collection,
        )
