"""
Cloudflare R2 Storage Service

Handles uploading incident media files to Cloudflare R2 bucket.
"""

import logging
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from typing import BinaryIO, Optional
from config import settings

logger = logging.getLogger(__name__)


class R2Service:
    """Service for uploading files to Cloudflare R2."""

    def __init__(self):
        """Initialize R2 client."""
        self.account_id = settings.r2_account_id
        self.access_key_id = settings.r2_access_key_id
        self.secret_access_key = settings.r2_secret_access_key
        self.bucket_name = settings.r2_bucket_name
        self.public_url = settings.r2_public_url

        # R2 endpoint URL format
        endpoint_url = f"https://{self.account_id}.r2.cloudflarestorage.com"

        # Initialize S3 client (R2 is S3-compatible)
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto"  # R2 uses "auto" region
        )

        logger.info(f"R2 Service initialized - Bucket: {self.bucket_name}")

    def upload_file(
        self,
        file_content: bytes,
        object_key: str,
        content_type: str = "application/octet-stream"
    ) -> Optional[str]:
        """
        Upload a file to R2.

        Args:
            file_content: File content as bytes
            object_key: Object key/path in bucket (e.g., "incidents/incident_123_20260118.jpg")
            content_type: MIME type of the file

        Returns:
            Public URL of uploaded file, or None if upload failed
        """
        try:
            # Upload to R2
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=file_content,
                ContentType=content_type
            )

            # Construct public URL
            public_url = f"{self.public_url}/{object_key}"
            logger.info(f"File uploaded to R2: {object_key}")

            return public_url

        except ClientError as e:
            logger.error(f"Failed to upload file to R2: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error uploading to R2: {e}")
            return None

    def delete_file(self, object_key: str) -> bool:
        """
        Delete a file from R2.

        Args:
            object_key: Object key/path in bucket

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            logger.info(f"File deleted from R2: {object_key}")
            return True

        except ClientError as e:
            logger.error(f"Failed to delete file from R2: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting from R2: {e}")
            return False


# Global service instance
r2_service = R2Service()
