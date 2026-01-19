# Dockerfile for Janmitra Voice Bot
FROM python:3.12-bookworm

# Install system dependencies for OpenCV (headless)
# Install system dependencies for OpenCV (headless)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*


# Note: Using full Python image to include OpenGL libs needed for OpenCV in SmallWebRTC

# Install uv
RUN pip install uv

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install dependencies
RUN uv sync --frozen

# Expose port for WebRTC server
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/offer || exit 1

# Run the bot
CMD ["uv", "run", "janmitra_bot.py", "--transport", "webrtc"]
