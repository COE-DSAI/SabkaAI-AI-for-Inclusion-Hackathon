"""
Authentication router for login and registration.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
from models import User
from schemas import UserLogin, UserRegister, Token, UserResponse, DuressPasswordSet, DuressPasswordRemove
from auth import authenticate_user, create_access_token, get_password_hash, set_auth_cookie, clear_auth_cookie, verify_password, get_current_user

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
# @limiter.limit("5/hour")  # 5 registrations per hour per IP - TEMPORARILY DISABLED
def register(request: Request, user_data: UserRegister, response: Response, db: Session = Depends(get_db)):
    """
    Register a new user and set httpOnly authentication cookie.
    Rate limited to 5 registrations per hour per IP address.

    Args:
        request: FastAPI request object
        user_data: User registration data
        response: FastAPI response object
        db: Database session

    Returns:
        JWT token and user object

    Raises:
        HTTPException: If email or phone already exists
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if phone already exists
    existing_phone = db.query(User).filter(User.phone == user_data.phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )

    # Create new user
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone,
        password_hash=get_password_hash(user_data.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create access token
    access_token = create_access_token(data={"sub": new_user.id})

    # Set httpOnly cookie
    set_auth_cookie(response, access_token)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(new_user)
    )


@router.post("/login", response_model=Token)
# @limiter.limit("10/hour")  # 10 login attempts per hour per IP - TEMPORARILY DISABLED
def login(request: Request, credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    """
    Login with email and password and set httpOnly authentication cookie.
    Rate limited to 10 login attempts per hour per IP address.

    Args:
        request: FastAPI request object
        credentials: Login credentials
        response: FastAPI response object
        db: Database session

    Returns:
        JWT token and user object

    Raises:
        HTTPException: If credentials are invalid
    """
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = create_access_token(data={"sub": user.id})

    # Set httpOnly cookie
    set_auth_cookie(response, access_token)

    # Log user type for debugging
    logger.info(f"[AUTH] Login successful for user {user.email}, user_type: {user.user_type}")

    user_response = UserResponse.from_orm(user)
    logger.info(f"[AUTH] UserResponse user_type: {user_response.user_type}")

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@router.post("/logout")
def logout(response: Response, request: Request):
    """
    Logout by clearing the authentication cookie.

    Args:
        response: FastAPI response object
        request: FastAPI request object

    Returns:
        Success message
    """
    logger.info(f"[AUTH] Logout endpoint called from {request.client.host}")
    logger.info(f"[AUTH] Request cookies: {request.cookies.keys()}")
    clear_auth_cookie(response)
    logger.info("[AUTH] Logout successful, cookie cleared")
    return {"message": "Successfully logged out"}


@router.post("/duress-password/set")
# @limiter.limit("5/hour")  # 5 attempts per hour per IP - TEMPORARILY DISABLED
def set_duress_password(
    request: Request,
    data: DuressPasswordSet,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Set or update the duress password for the current user.
    Requires current main password for verification.
    Rate limited to 5 attempts per hour per IP address.

    The duress password allows user to "stop" a walk in a coerced situation.
    Frontend shows walk stopped, but backend continues monitoring in silent mode
    and sends silent alerts to trusted contacts.

    Args:
        request: FastAPI request object
        data: Duress password data (current password + new duress password)
        current_user: Authenticated user
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If current password is invalid or duress password is same as main
    """
    # Verify current password
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    # Verify duress password is different from main password
    if verify_password(data.duress_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duress password must be different from main password"
        )

    # Hash and store duress password
    current_user.duress_password_hash = get_password_hash(data.duress_password)
    db.commit()

    return {
        "message": "Duress password set successfully",
        "has_duress_password": True
    }


@router.delete("/duress-password")
# @limiter.limit("5/hour")  # 5 attempts per hour per IP - TEMPORARILY DISABLED
def remove_duress_password(
    request: Request,
    data: DuressPasswordRemove,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove the duress password for the current user.
    Requires current main password for verification.
    Rate limited to 5 attempts per hour per IP address.

    Args:
        request: FastAPI request object
        data: Current password for verification
        current_user: Authenticated user
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If current password is invalid or no duress password set
    """
    # Verify current password
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    # Check if duress password exists
    if not current_user.duress_password_hash:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No duress password set"
        )

    # Remove duress password
    current_user.duress_password_hash = None
    db.commit()

    return {
        "message": "Duress password removed successfully",
        "has_duress_password": False
    }


@router.get("/duress-password/status")
def check_duress_password_status(
    current_user: User = Depends(get_current_user)
):
    """
    Check if the current user has a duress password set.
    Does not expose the actual password.

    Args:
        current_user: Authenticated user

    Returns:
        Status indicating if duress password is set
    """
    return {
        "has_duress_password": bool(current_user.duress_password_hash)
    }
