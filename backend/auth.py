"""
Authentication utilities for JWT token generation and password hashing.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from functools import lru_cache

from config import settings
from database import get_db
from models import User

# Set up logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token scheme (optional for backward compatibility)
security = HTTPBearer(auto_error=False)

# In-memory cache for user lookups (simple LRU cache)
# This caches the last 128 user lookups to reduce DB hits
@lru_cache(maxsize=128)
def _cached_user_lookup(user_id: int, cache_key: str) -> Optional[dict]:
    """
    Internal cache function. cache_key is timestamp rounded to nearest minute
    to invalidate cache every minute.
    """
    return None  # Will be populated by get_current_user


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Data to encode in the token
        expires_delta: Token expiration time

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)  # Default 7 days

    to_encode.update({"exp": expire})
    logger.warning(f"[AUTH] Creating token with secret_key: {settings.secret_key[:20]}...")
    logger.warning(f"[AUTH] Creating token with algorithm: {settings.algorithm}")
    logger.warning(f"[AUTH] Token payload: {to_encode}")
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    logger.warning(f"[AUTH] Created token: {encoded_jwt[:50]}...")
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """
    Decode a JWT access token.

    Args:
        token: JWT token to decode

    Returns:
        Decoded token data

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        logger.warning(f"[AUTH] Decoding token: {token[:50]}...")
        logger.warning(f"[AUTH] Using secret_key: {settings.secret_key[:20]}...")
        logger.warning(f"[AUTH] Using algorithm: {settings.algorithm}")
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        logger.warning(f"[AUTH] Decoded payload: {payload}")
        return payload
    except JWTError as e:
        logger.error(f"[AUTH] JWTError: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token (cookie or Bearer header).

    Supports both:
    - httpOnly cookie (preferred, more secure)
    - Authorization Bearer header (backward compatibility)

    Args:
        request: FastAPI request object
        credentials: HTTP Bearer credentials (optional)
        db: Database session

    Returns:
        Current user object

    Raises:
        HTTPException: If authentication fails
    """
    logger.warning(f"[AUTH] get_current_user called")

    # Try to get token from cookie first (more secure)
    token = request.cookies.get("access_token")
    if token:
        logger.warning(f"[AUTH] token from cookie: {token[:50]}...")

    # Fall back to Authorization header for backward compatibility
    elif credentials:
        logger.warning(f"[AUTH] credentials: {credentials}")
        token = credentials.credentials
        logger.warning(f"[AUTH] token from Bearer header: {token[:50] if token else 'None'}...")

    # No token found
    else:
        logger.error("[AUTH] No token found in cookie or Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)

    user_id_raw = payload.get("sub")
    logger.warning(f"[AUTH] user_id_raw from payload: {user_id_raw}, type: {type(user_id_raw)}")
    if user_id_raw is None:
        logger.error("[AUTH] user_id_raw is None!")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Convert to int (JWT returns strings)
    try:
        user_id = int(user_id_raw)
        logger.warning(f"[AUTH] converted user_id: {user_id}")
    except (ValueError, TypeError) as e:
        logger.error(f"[AUTH] Failed to convert user_id: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.warning(f"[AUTH] Looking up user with id={user_id}")
    user = db.query(User).filter(User.id == user_id).first()
    logger.warning(f"[AUTH] User lookup result: {user}")
    if user is None:
        logger.error(f"[AUTH] User with id={user_id} not found!")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.warning(f"[AUTH] Successfully authenticated user: {user.email}")
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate a user with email and password.

    Args:
        db: Database session
        email: User's email
        password: User's password

    Returns:
        User object if authentication successful, None otherwise
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def set_auth_cookie(response: Response, token: str) -> None:
    """
    Set the authentication token in an httpOnly cookie.

    Args:
        response: FastAPI response object
        token: JWT access token
    """
    # Cookie expiration: 7 days (same as JWT token)
    max_age = 7 * 24 * 60 * 60  # seconds

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,  # Prevents XSS attacks
        secure=settings.is_production,  # HTTPS only in production
        samesite="lax",  # CSRF protection
        max_age=max_age,
        path="/"
    )
    logger.info(f"[AUTH] Set auth cookie (httpOnly={True}, secure={settings.is_production})")


def clear_auth_cookie(response: Response) -> None:
    """
    Clear the authentication cookie.

    Args:
        response: FastAPI response object
    """
    # Set cookie with max_age=0 to delete it (more reliable than delete_cookie)
    response.set_cookie(
        key="access_token",
        value="",
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=0,  # Expire immediately
        path="/"
    )
    logger.info("[AUTH] Cleared auth cookie")
