# Protego Backend - Docker Deployment Guide

Complete guide for deploying Protego backend with Docker, PostgreSQL, Redis, and Nginx with SSL.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [SSL Certificate Setup](#ssl-certificate-setup)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Management](#management)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Production Checklist](#production-checklist)

---

## Prerequisites

### System Requirements
- Linux VPS (Ubuntu 20.04+ recommended)
- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ RAM
- 20GB+ storage
- Root or sudo access

### Install Docker
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

---

## Quick Start

### 1. Clone or Upload Project
```bash
# Upload your backend folder to VPS
scp -r backend/ user@your-vps-ip:/home/user/protego-backend/

# Or if using Git
git clone https://github.com/your-repo/protego.git
cd protego/backend
```

### 2. Copy Environment File
```bash
cp .env.docker .env
```

### 3. Edit Configuration
```bash
nano .env
```

**Required changes:**
- `POSTGRES_PASSWORD` - Strong database password
- `SECRET_KEY` - Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` - Your Twilio credentials
- All AI API keys (Whisper, MegaLLM, Azure)

### 4. Setup SSL
```bash
sudo ./setup-ssl.sh
```

Choose option:
- **Option 1**: Self-signed certificate (for IP-based access)
- **Option 2**: Let's Encrypt (if you have a domain)
- **Option 3**: Existing certificate files

### 5. Start Services
```bash
docker compose up -d
```

### 6. Check Logs
```bash
docker compose logs -f
```

### 7. Verify Deployment
```bash
# Check health
curl https://YOUR_IP_OR_DOMAIN/health

# Check API docs
curl https://YOUR_IP_OR_DOMAIN/docs
```

---

## SSL Certificate Setup

### Option 1: Self-Signed Certificate (IP Access)

**Best for:** Testing, development, IP-based access

```bash
sudo ./setup-ssl.sh
# Choose option 1
```

**Access:** `https://YOUR_IP/api`

**Note:** Browsers will show security warnings - this is normal.

---

### Option 2: Let's Encrypt (Domain)

**Best for:** Production with domain name

**Requirements:**
- Domain name pointing to your server IP
- Port 80 open for validation
- Port 443 open for HTTPS

```bash
# Stop nginx temporarily
docker compose stop nginx

# Run setup
sudo ./setup-ssl.sh
# Choose option 2
# Enter your domain: api.protego.com

# Start nginx
docker compose up -d nginx
```

**Auto-renewal:**
```bash
# Add to crontab
sudo crontab -e

# Add this line:
0 0 * * * certbot renew --quiet && cp /etc/letsencrypt/live/YOUR_DOMAIN/*.pem /path/to/nginx/ssl/ && cd /path/to/backend && docker compose restart nginx
```

---

### Option 3: Existing Certificates

```bash
# Copy your certificate files
cp /path/to/your/cert.pem nginx/ssl/cert.pem
cp /path/to/your/key.pem nginx/ssl/key.pem

# Set permissions
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

# Run setup
sudo ./setup-ssl.sh
# Choose option 3
```

---

## Configuration

### Environment Variables

Edit `.env` file with your production values:

```bash
# Database
POSTGRES_USER=protego
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=protego

# Security
SECRET_KEY=generate_with_secrets_module
ENVIRONMENT=production

# CORS & Frontend
ALLOWED_ORIGINS=https://protego.anaygupta.xyz,https://protego-black.vercel.app
FRONTEND_URL=https://protego.anaygupta.xyz

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_FROM=+1234567890
TEST_MODE=false

# AI Services
WHISPER_API_KEY=your_key
MEGALLM_API_KEY=your_key
AZURE_OPENAI_REALTIME_API_KEY=your_key
AZURE_OPENAI_REALTIME_ENDPOINT=wss://your-resource.openai.azure.com

# Safety Call
SAFETY_CALL_ENABLED=true
SAFETY_CALL_MAX_DURATION_MINUTES=10
SAFETY_CALL_ALERT_THRESHOLD=0.75
```

### Docker Compose Configuration

`docker-compose.yml` includes:
- **PostgreSQL 15** - Primary database
- **Redis 7** - Caching layer
- **Backend API** - FastAPI application
- **Nginx** - Reverse proxy with SSL

---

## Deployment

### Standard Deployment

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Check service status
docker compose ps
```

### Update Deployment

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build

# Check logs
docker compose logs -f backend
```

### Database Migrations

```bash
# Run migrations manually
docker compose exec backend python reset_database.py
```

---

## Management

### Service Control

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart a specific service
docker compose restart backend

# View service logs
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f db

# Execute command in container
docker compose exec backend bash
docker compose exec db psql -U protego -d protego
```

### Database Management

```bash
# Access PostgreSQL shell
docker compose exec db psql -U protego -d protego

# Backup database
docker compose exec db pg_dump -U protego protego > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20260116.sql | docker compose exec -T db psql -U protego -d protego

# View database size
docker compose exec db psql -U protego -d protego -c "SELECT pg_size_pretty(pg_database_size('protego'));"
```

### Redis Management

```bash
# Access Redis CLI
docker compose exec redis redis-cli

# Check Redis info
docker compose exec redis redis-cli INFO

# Clear cache
docker compose exec redis redis-cli FLUSHALL
```

### Log Management

```bash
# View all logs
docker compose logs

# Follow logs
docker compose logs -f

# View specific service logs
docker compose logs backend

# View last 100 lines
docker compose logs --tail=100 backend

# Save logs to file
docker compose logs > logs_$(date +%Y%m%d).txt
```

### Disk Space Management

```bash
# Check Docker disk usage
docker system df

# Clean up unused images
docker image prune -a

# Clean up unused volumes
docker volume prune

# Clean up everything unused
docker system prune -a --volumes
```

---

## Monitoring

### Health Checks

```bash
# Check service health
docker compose ps

# Check backend health endpoint
curl https://YOUR_IP/health

# Check all services
docker compose exec backend curl http://localhost:8000/health
```

### Performance Monitoring

```bash
# Resource usage
docker stats

# Specific container
docker stats protego-backend

# CPU and memory
docker compose top
```

### Database Monitoring

```bash
# Active connections
docker compose exec db psql -U protego -d protego -c "SELECT count(*) FROM pg_stat_activity;"

# Database size
docker compose exec db psql -U protego -d protego -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size FROM pg_database;"

# Table sizes
docker compose exec db psql -U protego -d protego -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

---

## Troubleshooting

### Common Issues

#### 1. Services won't start

```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs backend

# Common fixes:
# - Check .env file has all required values
# - Ensure ports 80, 443 are not in use
# - Verify SSL certificates exist
```

#### 2. Database connection failed

```bash
# Check database is running
docker compose ps db

# Check database logs
docker compose logs db

# Try connecting manually
docker compose exec backend python -c "from database import SessionLocal; db = SessionLocal(); print('✅ Connected')"
```

#### 3. SSL certificate errors

```bash
# Verify certificate files exist
ls -la nginx/ssl/

# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Regenerate self-signed cert
sudo ./setup-ssl.sh
```

#### 4. Nginx won't start

```bash
# Check nginx logs
docker compose logs nginx

# Test nginx configuration
docker compose exec nginx nginx -t

# Common issues:
# - Missing SSL certificates
# - Port conflicts (80/443 in use)
# - Syntax errors in nginx.conf
```

#### 5. Backend API errors

```bash
# Check backend logs
docker compose logs backend

# Check environment variables
docker compose exec backend env | grep -i api

# Restart backend
docker compose restart backend
```

### Debug Mode

```bash
# Run backend in debug mode
docker compose stop backend
docker compose run --rm backend python main.py

# Run with shell access
docker compose exec backend bash
```

---

## Production Checklist

### Security

- [ ] Strong `SECRET_KEY` (32+ characters)
- [ ] Strong database password
- [ ] `TEST_MODE=false`
- [ ] SSL certificate installed
- [ ] Firewall configured (ports 80, 443 open)
- [ ] Database not exposed publicly
- [ ] API keys secured in `.env`
- [ ] Root login disabled
- [ ] SSH key authentication enabled

### Configuration

- [ ] `ENVIRONMENT=production`
- [ ] Correct `ALLOWED_ORIGINS`
- [ ] Correct `FRONTEND_URL`
- [ ] All AI API keys configured
- [ ] Twilio credentials configured
- [ ] Sentry DSN configured (optional)
- [ ] Redis enabled
- [ ] Proper log levels

### Monitoring

- [ ] Health check endpoint working
- [ ] Log aggregation setup
- [ ] Disk space monitoring
- [ ] Database backups scheduled
- [ ] SSL certificate auto-renewal configured
- [ ] Uptime monitoring enabled

### Performance

- [ ] Database indexes created
- [ ] Redis caching enabled
- [ ] Gzip compression enabled
- [ ] Rate limiting configured
- [ ] Connection pooling enabled
- [ ] Worker processes tuned

### Backup

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker compose exec -T db pg_dump -U protego protego > $BACKUP_DIR/db_$DATE.sql

# Backup .env
cp .env $BACKUP_DIR/env_$DATE

# Compress
tar -czf $BACKUP_DIR/protego_backup_$DATE.tar.gz $BACKUP_DIR/db_$DATE.sql $BACKUP_DIR/env_$DATE

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "protego_backup_*.tar.gz" -mtime +7 -delete

echo "✅ Backup complete: $BACKUP_DIR/protego_backup_$DATE.tar.gz"
EOF

chmod +x backup.sh

# Add to crontab
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## Useful Commands

```bash
# Quick restart
docker compose restart

# Full rebuild
docker compose down && docker compose up -d --build

# View environment variables
docker compose exec backend env

# Check disk usage
df -h
docker system df

# Update system packages
sudo apt update && sudo apt upgrade -y

# Check firewall status
sudo ufw status

# Monitor logs in real-time
docker compose logs -f --tail=100
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                         Internet                         │
└────────────────────────┬────────────────────────────────┘
                         │
                    HTTPS (443)
                         │
            ┌────────────▼────────────┐
            │    Nginx (Alpine)       │
            │  - SSL Termination      │
            │  - Reverse Proxy        │
            │  - Rate Limiting        │
            │  - CORS Headers         │
            └────────────┬────────────┘
                         │
                    HTTP (8000)
                         │
            ┌────────────▼────────────┐
            │  Backend (FastAPI)      │
            │  - Python 3.11          │
            │  - Gunicorn + Uvicorn   │
            │  - 4 Workers            │
            └────┬──────────────┬─────┘
                 │              │
        ┌────────▼─────┐   ┌───▼────────┐
        │  PostgreSQL  │   │   Redis    │
        │  (Port 5432) │   │ (Port 6379)│
        │  - Database  │   │  - Cache   │
        └──────────────┘   └────────────┘
```

---

## Support

- Documentation: [README.md](README.md)
- Issues: Create GitHub issue
- Email: admin@protego.com

---

**Version:** 1.0
**Last Updated:** 2026-01-16
**Maintained By:** Protego Development Team
