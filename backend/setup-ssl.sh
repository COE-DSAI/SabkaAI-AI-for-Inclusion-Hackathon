#!/bin/bash

# Protego SSL Setup Script
# This script helps you set up SSL certificates for Nginx

set -e

echo "🔐 Protego SSL Certificate Setup"
echo "================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo"
    exit 1
fi

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo "📍 Server IP detected: $SERVER_IP"
echo ""

# Menu
echo "Choose SSL certificate option:"
echo "1. Generate self-signed certificate (for testing/IP-based access)"
echo "2. Use Let's Encrypt with domain (recommended for production)"
echo "3. Use existing certificate files"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "📝 Generating self-signed certificate..."

        # Create SSL directory if it doesn't exist
        mkdir -p nginx/ssl

        # Generate self-signed certificate valid for 1 year
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Protego/OU=IT/CN=$SERVER_IP" \
            -addext "subjectAltName=IP:$SERVER_IP"

        chmod 600 nginx/ssl/key.pem
        chmod 644 nginx/ssl/cert.pem

        echo "✅ Self-signed certificate generated!"
        echo "⚠️  Note: Browsers will show a security warning. This is normal for self-signed certs."
        echo "🌐 Access your API at: https://$SERVER_IP/api"
        ;;

    2)
        echo ""
        read -p "Enter your domain name (e.g., api.protego.com): " DOMAIN

        if [ -z "$DOMAIN" ]; then
            echo "❌ Domain name is required"
            exit 1
        fi

        echo "📝 Setting up Let's Encrypt for $DOMAIN..."

        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            echo "📦 Installing certbot..."
            apt-get update
            apt-get install -y certbot
        fi

        # Stop nginx if running
        docker-compose stop nginx 2>/dev/null || true

        # Get certificate
        certbot certonly --standalone \
            --preferred-challenges http \
            --email admin@$DOMAIN \
            --agree-tos \
            --no-eff-email \
            -d $DOMAIN

        # Copy certificates to nginx directory
        mkdir -p nginx/ssl
        cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
        cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem

        chmod 600 nginx/ssl/key.pem
        chmod 644 nginx/ssl/cert.pem

        echo "✅ Let's Encrypt certificate installed!"
        echo "🌐 Access your API at: https://$DOMAIN/api"
        echo ""
        echo "📅 Certificate auto-renewal:"
        echo "Add this to crontab: 0 0 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/*.pem /path/to/nginx/ssl/ && docker-compose restart nginx"
        ;;

    3)
        echo ""
        echo "📂 Place your certificate files in nginx/ssl/ directory:"
        echo "  - nginx/ssl/cert.pem (certificate)"
        echo "  - nginx/ssl/key.pem (private key)"
        echo ""
        read -p "Press Enter when files are in place..."

        if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
            echo "❌ Certificate files not found!"
            exit 1
        fi

        chmod 600 nginx/ssl/key.pem
        chmod 644 nginx/ssl/cert.pem

        echo "✅ Certificate files configured!"
        ;;

    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ SSL setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with production values"
echo "2. Run: docker-compose up -d"
echo "3. Check logs: docker-compose logs -f"
