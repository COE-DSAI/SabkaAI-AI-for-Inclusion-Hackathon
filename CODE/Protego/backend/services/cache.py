"""
Redis cache service for Protego.
Provides caching for frequently accessed data like user profiles, active sessions, and AI results.
"""

import json
import redis
from typing import Optional, Any
from config import settings
from logger import app_logger as logger


class CacheService:
    """
    Redis cache service with automatic fallback when Redis is unavailable.
    """

    def __init__(self):
        """Initialize Redis connection."""
        self.redis_client: Optional[redis.Redis] = None
        self.enabled = settings.redis_enabled

        if self.enabled:
            try:
                self.redis_client = redis.from_url(
                    settings.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_keepalive=True,
                    health_check_interval=30
                )
                # Test connection
                self.redis_client.ping()
                logger.info(f"✅ Redis cache connected: {settings.redis_url}")
            except (redis.ConnectionError, redis.RedisError) as e:
                logger.warning(f"⚠️  Redis connection failed: {e}. Caching disabled.")
                self.redis_client = None
                self.enabled = False

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found or cache unavailable
        """
        if not self.enabled or not self.redis_client:
            return None

        try:
            value = self.redis_client.get(key)
            if value:
                logger.debug(f"Cache HIT: {key}")
                return json.loads(value)
            logger.debug(f"Cache MISS: {key}")
            return None
        except (redis.RedisError, json.JSONDecodeError) as e:
            logger.warning(f"Cache GET error for key '{key}': {e}")
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (defaults to config.cache_ttl)

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.redis_client:
            return False

        try:
            ttl = ttl or settings.cache_ttl
            serialized = json.dumps(value)
            self.redis_client.setex(key, ttl, serialized)
            logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")
            return True
        except (redis.RedisError, json.JSONEncodeError, TypeError) as e:
            logger.warning(f"Cache SET error for key '{key}': {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete value from cache.

        Args:
            key: Cache key

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.redis_client:
            return False

        try:
            result = self.redis_client.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return bool(result)
        except redis.RedisError as e:
            logger.warning(f"Cache DELETE error for key '{key}': {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.

        Args:
            pattern: Key pattern (e.g., "user:*")

        Returns:
            Number of keys deleted
        """
        if not self.enabled or not self.redis_client:
            return 0

        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                deleted = self.redis_client.delete(*keys)
                logger.debug(f"Cache DELETE PATTERN: {pattern} ({deleted} keys)")
                return deleted
            return 0
        except redis.RedisError as e:
            logger.warning(f"Cache DELETE PATTERN error for pattern '{pattern}': {e}")
            return 0

    def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.

        Args:
            key: Cache key

        Returns:
            True if exists, False otherwise
        """
        if not self.enabled or not self.redis_client:
            return False

        try:
            return bool(self.redis_client.exists(key))
        except redis.RedisError as e:
            logger.warning(f"Cache EXISTS error for key '{key}': {e}")
            return False

    def clear_all(self) -> bool:
        """
        Clear all cached data (use with caution!).

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.redis_client:
            return False

        try:
            self.redis_client.flushdb()
            logger.warning("🗑️  Cache cleared (FLUSHDB)")
            return True
        except redis.RedisError as e:
            logger.error(f"Cache CLEAR ALL error: {e}")
            return False

    def close(self):
        """Close Redis connection."""
        if self.redis_client:
            try:
                self.redis_client.close()
                logger.info("Redis connection closed")
            except redis.RedisError as e:
                logger.warning(f"Error closing Redis connection: {e}")


# Cache key generators
def user_cache_key(user_id: int) -> str:
    """Generate cache key for user profile."""
    return f"user:{user_id}"


def session_cache_key(session_id: int) -> str:
    """Generate cache key for walk session."""
    return f"session:{session_id}"


def active_sessions_cache_key(user_id: int) -> str:
    """Generate cache key for user's active sessions."""
    return f"active_sessions:{user_id}"


def ai_result_cache_key(content_hash: str) -> str:
    """Generate cache key for AI analysis result."""
    return f"ai:{content_hash}"


# Global cache instance
cache = CacheService()
