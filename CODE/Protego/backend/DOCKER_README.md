# Protego Backend - Complete Docker Setup ✅

Production-ready Docker configuration with PostgreSQL, Redis, Nginx, and SSL support.

---

## 📁 Files Created

### Docker Configuration
- ✅ `docker-compose.yml` - Complete stack (PostgreSQL, Redis, Backend, Nginx)
- ✅ `Dockerfile.prod` - Production-optimized image with Gunicorn
- ✅ `docker-entrypoint.sh` - Startup script with health checks
- ✅ `.env.docker` - Environment template for Docker

### Nginx Configuration
- ✅ `nginx/nginx.conf` - Main Nginx configuration
- ✅ `nginx/conf.d/protego.conf` - API reverse proxy with SSL
- ✅ `nginx/ssl/` - SSL certificate directory

### Database
- ✅ `init.sql` - PostgreSQL initialization script

### Scripts
- ✅ `deploy-docker.sh` - Automated deployment script
- ✅ `setup-ssl.sh` - SSL certificate setup (self-signed, Let's Encrypt, or custom)
- ✅ `fix_postgres_role.sh` - Fix local PostgreSQL role issue

### Documentation
- ✅ `DOCKER_DEPLOYMENT.md` - Complete deployment guide
- ✅ `DOCKER_QUICKSTART.md` - 5-minute quick start
- ✅ `DOCKER_README.md` - This file

---

## 🚀 Quick Start

### Fix Your Current Issue (Local PostgreSQL)

```bash
# Your current error: role "Protego" does not exist
# Fix it:
cd /home/anay/Desktop/Projects/Protego/backend
sudo ./fix_postgres_role.sh
python reset_database.py
```

### Deploy to Docker on VPS

```bash
# One command deployment
./deploy-docker.sh
```

---

## 🎯 What's Included

### Services

1. **PostgreSQL 15** - Primary database with automatic initialization
2. **Redis 7** - Caching and session storage
3. **Backend API** - FastAPI with Gunicorn (4 workers)
4. **Nginx** - Reverse proxy with SSL, rate limiting, and CORS

### Features

- ✅ **SSL/TLS** - HTTPS with self-signed or Let's Encrypt certificates
- ✅ **Health Checks** - All services monitored
- ✅ **Auto-restart** - Services restart on failure
- ✅ **Rate Limiting** - API protection (10 req/s)
- ✅ **CORS** - Configured for Vercel frontend
- ✅ **WebSocket** - Support for AI real-time features
- ✅ **Logging** - Structured logs from all services
- ✅ **Backups** - Database backup scripts
- ✅ **Security** - Non-root user, minimal attack surface

---

## 📋 Requirements

### Updated Dependencies

`requirements.txt` now includes:
```txt
gunicorn==21.2.0  # ← Added for production deployment
```

All other dependencies remain the same.

---

## 🔧 Configuration

### Environment Variables (`.env`)

```bash
# Database
POSTGRES_USER=protego
POSTGRES_PASSWORD=CHANGE_THIS
POSTGRES_DB=protego

# Security
SECRET_KEY=GENERATE_THIS
ENVIRONMENT=production

# APIs
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
WHISPER_API_KEY=xxx
MEGALLM_API_KEY=xxx
AZURE_OPENAI_REALTIME_API_KEY=xxx

# Safety Call
SAFETY_CALL_ENABLED=true
SAFETY_CALL_MAX_DURATION_MINUTES=10
SAFETY_CALL_ALERT_THRESHOLD=0.75
```

Generate SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 🌐 SSL Certificates

### Option 1: Self-Signed (IP Access)

**Best for:** Testing, IP-based access

```bash
sudo ./setup-ssl.sh
# Choose option 1
```

Access: `https://YOUR_IP/api`

**Note:** Browsers show security warning (normal)

### Option 2: Let's Encrypt (Domain)

**Best for:** Production with domain

```bash
# Requirements: Domain pointing to your server
sudo ./setup-ssl.sh
# Choose option 2
# Enter domain: api.protego.com
```

Access: `https://api.protego.com/api`

### Option 3: Custom Certificates

```bash
# Place your files
cp cert.pem nginx/ssl/cert.pem
cp key.pem nginx/ssl/key.pem

sudo ./setup-ssl.sh
# Choose option 3
```

---

## 📦 Deployment

### Automated (Recommended)

```bash
./deploy-docker.sh
```

This script:
1. Checks Docker installation
2. Validates `.env` configuration
3. Sets up SSL certificates
4. Builds Docker images
5. Starts all services
6. Runs health checks
7. Shows access information

### Manual

```bash
# 1. Configure
cp .env.docker .env
nano .env

# 2. SSL
sudo ./setup-ssl.sh

# 3. Build & Start
docker compose up -d --build

# 4. Check
docker compose ps
docker compose logs -f
```

---

## 🔍 Monitoring

### Service Status

```bash
docker compose ps
```

### Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f db
```

### Health Checks

```bash
# Backend
curl https://YOUR_IP/health

# Database
docker compose exec db pg_isready -U protego

# Redis
docker compose exec redis redis-cli ping
```

### Resource Usage

```bash
docker stats
```

---

## 💾 Database Management

### Backup

```bash
# Create backup
docker compose exec db pg_dump -U protego protego > backup_$(date +%Y%m%d).sql

# Automated daily backups
0 2 * * * cd /path/to/backend && docker compose exec -T db pg_dump -U protego protego > backups/backup_$(date +\%Y\%m\%d).sql
```

### Restore

```bash
cat backup_20260116.sql | docker compose exec -T db psql -U protego -d protego
```

### Access Database

```bash
docker compose exec db psql -U protego -d protego
```

---

## 🔄 Updates

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build

# Check logs
docker compose logs -f backend
```

---

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs backend

# Rebuild from scratch
docker compose down -v
docker compose up -d --build
```

### Database Connection Failed

```bash
# Check database is running
docker compose ps db

# Check database logs
docker compose logs db

# Test connection
docker compose exec backend python -c "from database import SessionLocal; db = SessionLocal(); print('✅ Connected')"
```

### SSL Certificate Errors

```bash
# Check certificates exist
ls -la nginx/ssl/

# Verify certificate
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Regenerate
sudo ./setup-ssl.sh
```

### Nginx Won't Start

```bash
# Check configuration
docker compose exec nginx nginx -t

# Check logs
docker compose logs nginx

# Common fixes:
# - Verify SSL certificates exist
# - Check ports 80/443 not in use: sudo netstat -tulpn | grep -E '80|443'
```

---

## 🔒 Security

### Firewall Setup

```bash
# Install UFW
sudo apt install ufw

# Allow SSH (IMPORTANT!)
sudo ufw allow 22

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Production Checklist

- [ ] Strong database password
- [ ] Strong SECRET_KEY
- [ ] TEST_MODE=false
- [ ] All API keys configured
- [ ] SSL certificate installed
- [ ] Firewall enabled
- [ ] Database not publicly accessible
- [ ] Regular backups scheduled
- [ ] Monitoring setup
- [ ] Log rotation configured

---

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│            Internet (HTTPS)             │
└────────────────┬────────────────────────┘
                 │
            Port 443 (HTTPS)
                 │
    ┌────────────▼────────────┐
    │    Nginx (Alpine)       │
    │  - SSL Termination      │
    │  - Reverse Proxy        │
    │  - Rate Limiting        │
    │  - CORS Headers         │
    └────────────┬────────────┘
                 │
            Port 8000 (HTTP)
                 │
    ┌────────────▼────────────┐
    │  Backend (FastAPI)      │
    │  - Gunicorn (4 workers) │
    │  - Uvicorn Workers      │
    │  - Python 3.11          │
    └────┬──────────────┬─────┘
         │              │
    ┌────▼─────┐   ┌───▼────────┐
    │PostgreSQL│   │   Redis    │
    │(Port 5432│   │ (Port 6379)│
    │ Volume)  │   │  (Volume)  │
    └──────────┘   └────────────┘
```

---

## 📖 Documentation

- **[DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)** - 5-minute quick start
- **[DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)** - Complete deployment guide
- **[README.md](README.md)** - Main project README

---

## 🆘 Support

### Common Commands

```bash
# Fix local PostgreSQL role
sudo ./fix_postgres_role.sh

# Deploy to Docker
./deploy-docker.sh

# Setup SSL
sudo ./setup-ssl.sh

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Check health
curl https://YOUR_IP/health
```

### Getting Help

1. Check logs: `docker compose logs -f backend`
2. Review [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
3. Check service status: `docker compose ps`
4. Test health endpoint: `curl https://YOUR_IP/health`

---

**Version:** 1.0
**Created:** 2026-01-16
**Author:** Protego Development Team
