"""Supabase Storage Service - Upload recordings and files to Supabase Storage."""

import os
import logging
from typing import Optional
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class SupabaseStorageService:
    """Service for managing file uploads to Supabase Storage."""

    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        self.storage_url = f"{self.supabase_url}/storage/v1"

    async def _get_headers(self) -> dict:
        """Get authorization headers for Supabase requests."""
        return {
            "Authorization": f"Bearer {self.supabase_key}",
            "apikey": self.supabase_key,
        }

    async def create_bucket_if_not_exists(self, bucket_name: str, public: bool = False) -> bool:
        """Create a storage bucket if it doesn't exist."""
        try:
            headers = await self._get_headers()
            headers["Content-Type"] = "application/json"
            
            async with httpx.AsyncClient() as client:
                # Check if bucket exists
                response = await client.get(
                    f"{self.storage_url}/bucket/{bucket_name}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    logger.info(f"Bucket '{bucket_name}' already exists")
                    return True
                
                # Create bucket
                response = await client.post(
                    f"{self.storage_url}/bucket",
                    headers=headers,
                    json={
                        "id": bucket_name,
                        "name": bucket_name,
                        "public": public,
                    }
                )
                
                if response.status_code in [200, 201]:
                    logger.info(f"Created bucket '{bucket_name}'")
                    return True
                else:
                    logger.warning(f"Failed to create bucket: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error creating bucket: {e}")
            return False

    async def upload_file(
        self,
        bucket_name: str,
        file_path: str,
        destination_path: str,
        content_type: str = "application/octet-stream"
    ) -> Optional[str]:
        """
        Upload a file to Supabase Storage.
        
        Args:
            bucket_name: Name of the storage bucket
            file_path: Local path to the file
            destination_path: Path in the bucket (e.g., "recordings/meeting-123.mp4")
            content_type: MIME type of the file
            
        Returns:
            Public URL of the uploaded file, or None if failed
        """
        try:
            # Ensure bucket exists
            await self.create_bucket_if_not_exists(bucket_name)
            
            headers = await self._get_headers()
            headers["Content-Type"] = content_type
            
            with open(file_path, "rb") as f:
                file_content = f.read()
            
            async with httpx.AsyncClient(timeout=600) as client:
                response = await client.post(
                    f"{self.storage_url}/object/{bucket_name}/{destination_path}",
                    headers=headers,
                    content=file_content
                )
                
                if response.status_code in [200, 201]:
                    # Return the public URL
                    public_url = f"{self.supabase_url}/storage/v1/object/public/{bucket_name}/{destination_path}"
                    logger.info(f"Uploaded file to {public_url}")
                    return public_url
                else:
                    logger.error(f"Failed to upload file: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            return None

    async def upload_recording(
        self,
        meeting_id: str,
        file_path: str
    ) -> Optional[str]:
        """
        Upload a meeting recording to Supabase Storage.
        
        Args:
            meeting_id: UUID of the meeting
            file_path: Local path to the recording file
            
        Returns:
            Public URL of the uploaded recording
        """
        # Determine content type based on extension
        ext = os.path.splitext(file_path)[1].lower()
        content_types = {
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".m4a": "audio/mp4",
        }
        content_type = content_types.get(ext, "application/octet-stream")
        
        destination_path = f"recordings/{meeting_id}{ext}"
        
        return await self.upload_file(
            bucket_name="recordings",
            file_path=file_path,
            destination_path=destination_path,
            content_type=content_type
        )

    async def upload_transcript(
        self,
        meeting_id: str,
        transcript_text: str
    ) -> Optional[str]:
        """
        Upload a meeting transcript as a text file.
        
        Args:
            meeting_id: UUID of the meeting
            transcript_text: Full transcript text
            
        Returns:
            Public URL of the uploaded transcript
        """
        try:
            # Ensure bucket exists
            await self.create_bucket_if_not_exists("transcripts")
            
            headers = await self._get_headers()
            headers["Content-Type"] = "text/plain; charset=utf-8"
            
            destination_path = f"transcripts/{meeting_id}.txt"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.storage_url}/object/transcripts/{destination_path}",
                    headers=headers,
                    content=transcript_text.encode("utf-8")
                )
                
                if response.status_code in [200, 201]:
                    public_url = f"{self.supabase_url}/storage/v1/object/public/transcripts/{destination_path}"
                    logger.info(f"Uploaded transcript to {public_url}")
                    return public_url
                else:
                    logger.error(f"Failed to upload transcript: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error uploading transcript: {e}")
            return None

    async def get_signed_url(
        self,
        bucket_name: str,
        file_path: str,
        expires_in: int = 3600
    ) -> Optional[str]:
        """
        Get a signed URL for private file access.
        
        Args:
            bucket_name: Name of the storage bucket
            file_path: Path to the file in the bucket
            expires_in: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Signed URL for temporary access
        """
        try:
            headers = await self._get_headers()
            headers["Content-Type"] = "application/json"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.storage_url}/object/sign/{bucket_name}/{file_path}",
                    headers=headers,
                    json={"expiresIn": expires_in}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    signed_url = f"{self.supabase_url}/storage/v1{data.get('signedURL', '')}"
                    return signed_url
                else:
                    logger.error(f"Failed to get signed URL: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting signed URL: {e}")
            return None

    async def delete_file(self, bucket_name: str, file_path: str) -> bool:
        """Delete a file from Supabase Storage."""
        try:
            headers = await self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.storage_url}/object/{bucket_name}/{file_path}",
                    headers=headers
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"Deleted file {bucket_name}/{file_path}")
                    return True
                else:
                    logger.error(f"Failed to delete file: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False

    async def list_files(self, bucket_name: str, prefix: str = "") -> list:
        """List files in a bucket with optional prefix filter."""
        try:
            headers = await self._get_headers()
            headers["Content-Type"] = "application/json"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.storage_url}/object/list/{bucket_name}",
                    headers=headers,
                    json={"prefix": prefix, "limit": 100}
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to list files: {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return []


# Singleton instance
storage_service = SupabaseStorageService()
