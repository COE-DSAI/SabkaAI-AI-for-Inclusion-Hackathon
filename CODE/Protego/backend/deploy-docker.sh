#!/bin/bash

# Protego Backend - Docker Deployment Script
# Complete automated deployment with SSL setup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "============================================================"
echo "  🚀 Protego Backend - Docker Deployment"
echo "============================================================"
echo -e "${NC}"

# Check if running as root/sudo
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ Please do not run this script as root${NC}"
    echo "Run without sudo, you'll be prompted when needed"
    exit 1
fi

# Check Docker installation
echo -e "${YELLOW}→ Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo ""
    echo "Install Docker with:"
    echo "  curl -fsSL https://get.docker.com | sh"
    echo "  sudo usermod -aG docker \$USER"
    echo "  newgrp docker"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo ""
    echo "Install Docker Compose with:"
    echo "  sudo apt install docker-compose-plugin"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"

# Check .env file
echo ""
echo -e "${YELLOW}→ Checking configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    if [ -f ".env.docker" ]; then
        echo "Copying .env.docker to .env..."
        cp .env.docker .env
        echo -e "${GREEN}✓ Created .env from template${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env file with your actual values:${NC}"
        echo "  - POSTGRES_PASSWORD"
        echo "  - SECRET_KEY"
        echo "  - TWILIO credentials"
        echo "  - AI API keys"
        echo ""
        read -p "Press Enter after editing .env file..."
    else
        echo -e "${RED}❌ No .env.docker template found${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Configuration file exists${NC}"

# Check SSL certificates
echo ""
echo -e "${YELLOW}→ Checking SSL certificates...${NC}"
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    echo -e "${YELLOW}⚠️  SSL certificates not found${NC}"
    echo ""
    echo "Choose SSL setup option:"
    echo "1. Generate self-signed certificate (for IP access)"
    echo "2. I'll setup certificates manually"
    echo "3. Skip for now (HTTP only - not recommended)"
    echo ""
    read -p "Enter choice [1-3]: " ssl_choice

    case $ssl_choice in
        1)
            echo ""
            echo "Generating self-signed certificate..."

            # Get server IP
            SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
            echo "Server IP: $SERVER_IP"

            mkdir -p nginx/ssl

            sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout nginx/ssl/key.pem \
                -out nginx/ssl/cert.pem \
                -subj "/C=US/ST=State/L=City/O=Protego/OU=IT/CN=$SERVER_IP" \
                -addext "subjectAltName=IP:$SERVER_IP" 2>/dev/null || true

            sudo chmod 644 nginx/ssl/cert.pem
            sudo chmod 600 nginx/ssl/key.pem
            sudo chown $USER:$USER nginx/ssl/*.pem

            echo -e "${GREEN}✓ Self-signed certificate generated${NC}"
            echo -e "${YELLOW}⚠️  Browsers will show security warnings (normal for self-signed)${NC}"
            ;;
        2)
            echo ""
            echo "Place your certificate files at:"
            echo "  nginx/ssl/cert.pem"
            echo "  nginx/ssl/key.pem"
            echo ""
            read -p "Press Enter when ready..."

            if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
                echo -e "${RED}❌ Certificates still not found!${NC}"
                exit 1
            fi
            echo -e "${GREEN}✓ Certificates found${NC}"
            ;;
        3)
            echo -e "${YELLOW}⚠️  Skipping SSL setup - HTTP only${NC}"
            mkdir -p nginx/ssl
            touch nginx/ssl/cert.pem nginx/ssl/key.pem
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            exit 1
            ;;
    esac
else
    echo -e "${GREEN}✓ SSL certificates found${NC}"
fi

# Build images
echo ""
echo -e "${YELLOW}→ Building Docker images...${NC}"
docker compose build --no-cache

echo -e "${GREEN}✓ Images built successfully${NC}"

# Stop existing containers
echo ""
echo -e "${YELLOW}→ Stopping existing containers...${NC}"
docker compose down 2>/dev/null || true

# Start services
echo ""
echo -e "${YELLOW}→ Starting services...${NC}"
docker compose up -d

echo -e "${GREEN}✓ Services started${NC}"

# Wait for services to be healthy
echo ""
echo -e "${YELLOW}→ Waiting for services to be healthy...${NC}"
echo "This may take 30-60 seconds..."

MAX_WAIT=120
WAIT_TIME=0
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    if docker compose ps | grep -q "unhealthy"; then
        echo -n "."
        sleep 5
        WAIT_TIME=$((WAIT_TIME + 5))
    else
        break
    fi
done

echo ""

# Check service status
echo ""
echo -e "${YELLOW}→ Service Status:${NC}"
docker compose ps

# Get service info
DB_STATUS=$(docker compose ps db --format "{{.Status}}" 2>/dev/null || echo "unknown")
REDIS_STATUS=$(docker compose ps redis --format "{{.Status}}" 2>/dev/null || echo "unknown")
BACKEND_STATUS=$(docker compose ps backend --format "{{.Status}}" 2>/dev/null || echo "unknown")
NGINX_STATUS=$(docker compose ps nginx --format "{{.Status}}" 2>/dev/null || echo "unknown")

echo ""
echo -e "${BLUE}Service Health:${NC}"
echo "  Database:  $DB_STATUS"
echo "  Redis:     $REDIS_STATUS"
echo "  Backend:   $BACKEND_STATUS"
echo "  Nginx:     $NGINX_STATUS"

# Test backend health
echo ""
echo -e "${YELLOW}→ Testing backend health...${NC}"
sleep 5

if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check failed${NC}"
    echo "Check logs with: docker compose logs backend"
fi

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

# Summary
echo ""
echo -e "${GREEN}"
echo "============================================================"
echo "  ✅ Deployment Complete!"
echo "============================================================"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Access Information:${NC}"
echo "  📍 Server IP:    $SERVER_IP"
echo "  🔐 HTTPS API:    https://$SERVER_IP/api"
echo "  🔓 HTTP API:     http://$SERVER_IP/api"
echo "  📚 API Docs:     https://$SERVER_IP/docs"
echo "  ❤️  Health:       https://$SERVER_IP/health"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs:       docker compose logs -f"
echo "  Stop services:   docker compose down"
echo "  Restart:         docker compose restart"
echo "  Update:          docker compose up -d --build"
echo ""
echo -e "${BLUE}Database Management:${NC}"
echo "  Connect to DB:   docker compose exec db psql -U protego -d protego"
echo "  Backup DB:       docker compose exec db pg_dump -U protego protego > backup.sql"
echo ""
echo -e "${BLUE}Monitoring:${NC}"
echo "  Watch logs:      docker compose logs -f backend"
echo "  Check health:    curl https://$SERVER_IP/health"
echo "  Service stats:   docker stats"
echo ""

# Show recent backend logs
echo -e "${YELLOW}Recent Backend Logs:${NC}"
docker compose logs --tail=20 backend

echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "1. Verify all services are healthy: docker compose ps"
echo "2. Test API endpoint: curl https://$SERVER_IP/health"
echo "3. Check backend logs: docker compose logs -f backend"
echo "4. Update Vercel frontend with new API URL"
echo ""
