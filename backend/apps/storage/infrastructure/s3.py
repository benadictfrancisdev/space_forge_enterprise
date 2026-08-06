"""S3-compatible object storage (AWS S3, MinIO, etc.)."""
from __future__ import annotations

import hashlib
import logging
from typing import Any

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from django.conf import settings

from apps.storage.domain.provider import ObjectStorageProvider, StoredObject

logger = logging.getLogger("spaceforge.storage")


class S3ObjectStorage(ObjectStorageProvider):
    def __init__(
        self,
        *,
        endpoint_url: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        bucket: str | None = None,
        region: str | None = None,
        use_ssl: bool | None = None,
    ):
        self.bucket = bucket or settings.S3_BUCKET
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url or settings.S3_ENDPOINT_URL,
            aws_access_key_id=access_key or settings.S3_ACCESS_KEY,
            aws_secret_access_key=secret_key or settings.S3_SECRET_KEY,
            region_name=region or settings.S3_REGION,
            use_ssl=settings.S3_USE_SSL if use_ssl is None else use_ssl,
            config=Config(signature_version="s3v4"),
        )

    def upload(
        self,
        *,
        key: str,
        body: bytes,
        content_type: str = "application/octet-stream",
        metadata: dict[str, str] | None = None,
    ) -> StoredObject:
        meta = {k: str(v) for k, v in (metadata or {}).items()}
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=body,
            ContentType=content_type,
            Metadata=meta,
        )
        return StoredObject(
            key=key,
            size_bytes=len(body),
            content_type=content_type,
            checksum_sha256=hashlib.sha256(body).hexdigest(),
            metadata=meta,
        )

    def download(self, *, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    def delete(self, *, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def exists(self, *, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False

    def signed_url(self, *, key: str, expires_in: int = 3600, method: str = "get") -> str:
        client_method = "get_object" if method.lower() == "get" else "put_object"
        return self.client.generate_presigned_url(
            client_method,
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    def health_check(self) -> dict[str, Any]:
        try:
            self.client.head_bucket(Bucket=self.bucket)
            return {"ok": True, "provider": "s3", "bucket": self.bucket}
        except Exception as exc:  # noqa: BLE001
            # head_bucket may fail on some MinIO setups; fall back to list
            try:
                self.client.list_objects_v2(Bucket=self.bucket, MaxKeys=1)
                return {"ok": True, "provider": "s3", "bucket": self.bucket}
            except Exception as inner:  # noqa: BLE001
                logger.warning("storage_health_failed", extra={"error": str(inner)})
                return {"ok": False, "provider": "s3", "error": str(exc or inner)}
