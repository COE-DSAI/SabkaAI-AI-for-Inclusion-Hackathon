# Protego Backend - Docker Quick Start

**Complete deployment in 5 minutes** ⚡

---

## For Your Current VPS (Fix Local Issue First)

You're getting "role Protego does not exist" because the PostgreSQL role wasn't created properly.

### Fix It Now:

```bash
cd /home/anay/Desktop/Projects/Protego/backend

# Run the fix script
sudo ./fix_postgres_role.sh

# Then run database reset
python reset_database.py
```

This will:
- Create the "Protego" role with password "Protego0305"
- Grant all necessary privileges
- Test the connection

---

## Docker Deployment (For VPS Production)

### Option 1: Automated Deployment (Recommended)

```bash
cd /home/anay/Desktop/Projects/Protego/backend

# Run the automated deployment script
./deploy-docker.sh
```

This script will:
1. Check Docker installation
2. Setup SSL certificates (self-signed for IP access)
3. Build Docker images
4. Start all services (PostgreSQL, Redis, Backend, Nginx)
5. Test health endpoints
6. Show access URLs

**Time:** ~3-5 minutes

---

### Option 2: Manual Deployment

```bash
# 1. Copy environment template
cp .env.docker .env

# 2. Edit with your values
nano .env
# Update: POSTGRES_PASSWORD, SECRET_KEY, TWILIO_*, AI API keys

# 3. Setup SSL
sudo ./setup-ssl.sh
# Choose option 1 for self-signed certificate

# 4. Build and start
docker compose up -d --build

# 5. Check logs
docker compose logs -f
```

---

## Access Your API

After deployment:

```bash
# Your server IP
SERVER_IP=$(curl -s ifconfig.me)

# Test health
curl https://$SERVER_IP/health

# View API docs
open https://$SERVER_IP/docs

# Check logs
docker compose logs -f backend
```

---

## Quick Commands

```bash
# View all services
docker compose ps

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop everything
docker compose down

# Update and rebuild
docker compose up -d --build

# Database backup
docker compose exec db pg_dump -U protego protego > backup.sql

# Access database
docker compose exec db psql -U protego -d protego

# Access Redis
docker compose exec redis redis-cli
```

---

## Troubleshooting

### Services won't start
```bash
docker compose logs
```

### Database connection failed
```bash
docker compose exec backend env | grep DATABASE
docker compose logs db
```

### SSL certificate error
```bash
# Regenerate self-signed cert
sudo ./setup-ssl.sh
```

### Backend errors
```bash
docker compose logs backend
docker compose restart backend
```

---

## Architecture

```
Internet → Nginx (443) → Backend (8000) → PostgreSQL (5432)
                                       → Redis (6379)
```

---

## Environment Variables

**Required in `.env`:**

```bash
# Database
POSTGRES_PASSWORD=strong_password_here

# Security
SECRET_KEY=generate_with_secrets_module

# Twilio (for SMS)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_FROM=+1234567890

# AI Services
WHISPER_API_KEY=xxx
MEGALLM_API_KEY=xxx
AZURE_OPENAI_REALTIME_API_KEY=xxx
AZURE_OPENAI_REALTIME_ENDPOINT=wss://xxx
```

Generate SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Production Checklist

- [ ] `.env` file configured with production values
- [ ] Strong `POSTGRES_PASSWORD` set
- [ ] Strong `SECRET_KEY` set
- [ ] `TEST_MODE=false`
- [ ] `ENVIRONMENT=production`
- [ ] All AI API keys configured
- [ ] Twilio credentials configured
- [ ] SSL certificate installed
- [ ] Firewall configured (ports 80, 443 open)
- [ ] Backend health check passing
- [ ] Database backup scheduled

---

## Next Steps

1. **Test API:** `curl https://YOUR_IP/health`
2. **Update Vercel:** Add API URL as environment variable
3. **Monitor:** `docker compose logs -f backend`
4. **Setup backups:** See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md#backup)

---

## Support

- Full documentation: [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
- Fix local PostgreSQL: `sudo ./fix_postgres_role.sh`
- Deploy to Docker: `./deploy-docker.sh`

**Version:** 1.0
**Updated:** 2026-01-16
