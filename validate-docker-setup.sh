#!/bin/bash
# Docker Deployment Validation Script
# Run this to validate the Docker setup before deployment

set -e

echo "🧪 Validating JARS Docker Deployment Setup..."

# Check if required files exist
echo "📁 Checking required files..."

required_files=(
    "docker-compose.yml"
    "backend/Dockerfile"
    "backend/docker/start.sh"
    "docker/init-db.sql"
    ".env.docker.example"
    "DEPLOYMENT.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
        exit 1
    fi
done

# Check Docker availability
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not installed. Please install Docker Desktop first."
    echo "   Download from: https://www.docker.com/products/docker-desktop/"
else
    echo "✅ Docker is available"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "⚠️  Docker Compose not available."
else
    echo "✅ Docker Compose is available"
fi

# Validate docker-compose.yml syntax
echo "🔍 Validating docker-compose.yml..."
if command -v docker-compose &> /dev/null; then
    docker-compose config -q && echo "✅ docker-compose.yml syntax is valid"
elif docker compose version &> /dev/null; then
    docker compose config -q && echo "✅ docker-compose.yml syntax is valid"
else
    echo "⚠️  Cannot validate docker-compose.yml (Docker not available)"
fi

# Check environment configuration
echo "🔧 Checking environment setup..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
else
    echo "⚠️  .env file not found. Copy from .env.docker.example:"
    echo "   cp .env.docker.example .env"
fi

# Validate backend build context
echo "📦 Validating backend build context..."
if [ -f "backend/package.json" ]; then
    echo "✅ backend/package.json exists"
else
    echo "❌ backend/package.json missing"
    exit 1
fi

if [ -f "backend/prisma/schema.prisma" ]; then
    echo "✅ Prisma schema exists"
else
    echo "❌ Prisma schema missing"
    exit 1
fi

echo ""
echo "🎉 Validation Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Ensure Docker Desktop is running"
echo "2. Copy environment: cp .env.docker.example .env"
echo "3. Start services: docker-compose up"
echo "4. Test health: curl http://localhost:3000/api/v1/health"
echo ""
echo "📖 Full instructions: see DEPLOYMENT.md"