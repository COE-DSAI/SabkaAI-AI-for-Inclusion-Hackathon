"""
Protego Backend - FastAPI Application
Main entry point for the AI-Powered Personal Safety Companion API.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from database import init_db
from routers import users, walk, alerts, admin, auth, ai, safe_locations, emergency_contacts, tracking, safety_call, government, incidents
from logger import app_logger as logger, configure_stdlib_logging

# Configure Sentry if DSN is provided
if settings.sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        profiles_sample_rate=settings.sentry_profiles_sample_rate,
        environment=settings.environment,
        enable_tracing=True,
    )
    logger.info("Sentry error tracking initialized")
else:
    logger.warning("Sentry DSN not configured - error tracking disabled")


# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application.
    Handles startup and shutdown events.
    """
    # Configure standard library logging to use loguru
    configure_stdlib_logging()

    # Startup: Initialize database
    logger.info("🚀 Starting Protego Backend...")
    logger.info(f"📊 Environment: {settings.environment}")
    logger.info(f"🧪 Test Mode: {settings.test_mode}")

    # Validate production configuration
    try:
        settings.validate_production_config()
        logger.success("✅ Production configuration validated")
    except ValueError as e:
        logger.critical(f"❌ Production configuration error: {e}")
        raise

    try:
        init_db()
        logger.success("✅ Database initialized")
    except Exception as e:
        logger.critical(f"Failed to initialize database: {e}")
        raise

    # Recover pending alerts from database
    from services.alert_manager import alert_manager
    try:
        recovered_count = await alert_manager.recover_pending_alerts()
        logger.info(f"🔄 Recovered {recovered_count} pending alerts from database")
    except Exception as e:
        logger.error(f"Failed to recover pending alerts: {e}")

    logger.success("✨ Protego Backend started successfully")

    yield

    # Shutdown
    logger.info("👋 Shutting down Protego Backend...")
    logger.success("✅ Protego Backend shut down gracefully")


# Initialize FastAPI application
app = FastAPI(
    title="Protego API",
    description="AI-Powered Personal Safety Companion - Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Include routers
app.include_router(auth.router, prefix="/api/users", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(walk.router, prefix="/api/walk", tags=["Walk Sessions"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Analysis"])
app.include_router(safe_locations.router, prefix="/api/safe-locations", tags=["Safe Locations"])
app.include_router(emergency_contacts.router, prefix="/api/emergency-contacts", tags=["Emergency Contacts"])
app.include_router(tracking.router, prefix="/api", tags=["Live Tracking"])  # Public endpoint, no auth required
app.include_router(safety_call.router, tags=["Safety Call"])
app.include_router(government.router, prefix="/api/gov", tags=["Government"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incident Reports"])


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - Health check."""
    return {
        "service": "Protego API",
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.environment
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",
        "test_mode": settings.test_mode
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if not settings.is_production else False
    )
