"""
Structured logging configuration using loguru.
Provides JSON-formatted logs for production and readable logs for development.
"""

import sys
import logging
from pathlib import Path
from loguru import logger
from config import settings


def setup_logging():
    """
    Configure loguru logger based on environment.

    Development: Colorized console output with detailed formatting
    Production: JSON-formatted logs with rotation and retention policies
    """
    # Remove default handler
    logger.remove()

    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    if settings.is_production:
        # Production: JSON logs to file with rotation
        logger.add(
            "logs/protego_{time:YYYY-MM-DD}.log",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
            level="INFO",
            rotation="00:00",  # Rotate at midnight
            retention="30 days",  # Keep logs for 30 days
            compression="zip",  # Compress rotated logs
            serialize=True,  # JSON format
            enqueue=True,  # Thread-safe
            backtrace=True,  # Show full traceback
            diagnose=True  # Show variable values in traceback
        )

        # Also log errors to separate file
        logger.add(
            "logs/protego_errors_{time:YYYY-MM-DD}.log",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
            level="ERROR",
            rotation="00:00",
            retention="90 days",  # Keep error logs longer
            compression="zip",
            serialize=True,
            enqueue=True,
            backtrace=True,
            diagnose=True
        )

        # Console output for critical errors only
        logger.add(
            sys.stderr,
            format="<red>{time:YYYY-MM-DD HH:mm:ss}</red> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | <level>{message}</level>",
            level="ERROR",
            colorize=True
        )

    else:
        # Development: Colorized console output with detailed formatting
        logger.add(
            sys.stderr,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | <level>{message}</level>",
            level="DEBUG",
            colorize=True,
            backtrace=True,
            diagnose=True
        )

        # Also log to file in development for debugging
        logger.add(
            "logs/protego_dev_{time:YYYY-MM-DD}.log",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
            level="DEBUG",
            rotation="10 MB",  # Rotate when file reaches 10MB
            retention="7 days",  # Keep dev logs for 7 days
            enqueue=True
        )

    logger.info(f"Logging configured for {settings.environment} environment")
    return logger


# Intercept standard library logging and redirect to loguru
class InterceptHandler(logging.Handler):
    """
    Intercept standard library logging and redirect to loguru.
    """
    def emit(self, record):
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where the logged message originated
        frame, depth = logging.currentframe(), 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


def configure_stdlib_logging():
    """
    Configure standard library logging to use loguru.
    Redirects uvicorn, sqlalchemy, and other library logs to loguru.
    """
    import logging

    # Intercept standard library logging
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)

    # Set levels for noisy libraries
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)


# Initialize logger
app_logger = setup_logging()
