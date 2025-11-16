# 🚀 JARS Cannabis Mobile App - Deployment Guide

This guide provides one-click deployment instructions for the JARS Cannabis Mobile App backend using Docker Compose.

## 🎯 Quick Start (One-Click Deployment)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Git](https://git-scm.com/) to clone the repository

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/SDawson777/jars-cannabis-mobile-app.git
cd jars-cannabis-mobile-app

# Copy environment configuration
cp .env.docker.example .env
```

### 2. One-Click Deployment

```bash
# Start everything with one command
docker-compose up
```

That's it! 🎉 The backend will be available at `http://localhost:3000`

## 📱 Connect Mobile App to Docker Backend

### For Development with Expo

1. In your mobile app directory, create/update `.env`:

```bash
# Mobile app .env file
EXPO_PUBLIC_API_URL=http://localhost:3000
```

2. Start your mobile app:

```bash
# In the mobile app directory
npx expo start
```

### For Physical Device Testing

If testing on a physical device, replace `localhost` with your computer's IP address:

```bash
# Find your IP address
# On macOS/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1
# On Windows: ipconfig | findstr "IPv4"

# Example mobile app .env:
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

## 🛠️ Docker Services

The Docker Compose setup includes:

### 📊 PostgreSQL Database (`db`)

- **Image**: `postgres:15-alpine`
- **Port**: `5432` (configurable via `POSTGRES_PORT`)
- **Database**: `jars_dev`
- **Username**: `jars`
- **Password**: `jars123`
- **Persistent Volume**: Database data preserved between restarts

### 🗄️ Redis Cache (`redis`)

- **Image**: `redis:7-alpine`
- **Port**: `6379` (configurable via `REDIS_PORT`)
- **Persistent Volume**: Cache data preserved between restarts
- **Purpose**: Caching and future queue management

### 🚀 Backend API (`backend`)

- **Port**: `3000` (configurable via `BACKEND_PORT`)
- **Auto-Migration**: Runs database migrations on startup
- **Auto-Seeding**: Populates sample data (configurable via `SEED_DATABASE`)
- **Health Checks**: Built-in monitoring for all services

## 📋 Available Commands

### Basic Operations

```bash
# Start all services in foreground
docker-compose up

# Start all services in background
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# View logs
docker-compose logs -f backend
docker-compose logs -f db
docker-compose logs -f redis
```

### Development Commands

```bash
# Rebuild backend after code changes
docker-compose build backend
docker-compose up -d backend

# Access backend container shell
docker-compose exec backend sh

# Access database
docker-compose exec db psql -U jars -d jars_dev

# Access Redis CLI
docker-compose exec redis redis-cli
```

## 🔧 Configuration

### Environment Variables

Customize your deployment by editing the `.env` file:

```bash
# Database
POSTGRES_USER=jars
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=jars_production

# Ports
POSTGRES_PORT=5432
REDIS_PORT=6379
BACKEND_PORT=3000

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
BCRYPT_ROUNDS=12

# Features
SEED_DATABASE=false  # Set to false for production
DEBUG=false

# Optional: Stripe for payments
STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_SECRET_KEY=sk_live_your_key

# Optional: AI features
OPENAI_API_KEY=sk-your-openai-key
```

### Production Configuration

For production deployment:

1. **Security**: Change default passwords and JWT secrets
2. **SSL**: Add SSL/TLS termination (nginx proxy, CloudFlare, etc.)
3. **Backups**: Set up automated database backups
4. **Monitoring**: Add monitoring and log aggregation
5. **Scaling**: Consider using Docker Swarm or Kubernetes

## 🧪 Testing the Deployment

### 1. Health Check

```bash
curl http://localhost:3000/api/v1/health
# Expected: {"ok":true}
```

### 2. API Endpoints

```bash
# Test authentication
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Test product listing
curl http://localhost:3000/products
```

### 3. Database Verification

```bash
# Access database and check tables
docker-compose exec db psql -U jars -d jars_dev -c "\dt"
```

## 🐛 Troubleshooting

### Common Issues

#### "Port already in use"

```bash
# Check what's using the port
lsof -i :3000  # or :5432, :6379

# Change port in .env file
echo "BACKEND_PORT=3001" >> .env
docker-compose up
```

#### "Database connection failed"

```bash
# Check database logs
docker-compose logs db

# Restart database service
docker-compose restart db
```

#### "Cannot build backend"

```bash
# Clean build
docker-compose build --no-cache backend

# Check backend logs
docker-compose logs -f backend
```

### Reset Everything

```bash
# Nuclear option - reset all data and containers
docker-compose down -v --remove-orphans
docker system prune -f
docker-compose up --build
```

## 📊 Monitoring

### Service Status

```bash
# Check running services
docker-compose ps

# Check service health
docker-compose exec backend curl -f http://localhost:3000/api/v1/health
```

### Resource Usage

```bash
# Monitor resource usage
docker stats jars-backend jars-postgres jars-redis
```

## 🔄 Updates and Maintenance

### Updating the Backend

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose build backend
docker-compose up -d backend
```

### Database Migrations

```bash
# Migrations run automatically on backend startup
# To run manually:
docker-compose exec backend npx prisma migrate deploy
```

### Backup Database

```bash
# Create database backup
docker-compose exec db pg_dump -U jars -d jars_dev > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T db psql -U jars -d jars_dev < backup_20241115.sql
```

## � Demo Mode

### Complete Sandbox Environment

The JARS app includes a comprehensive demo mode with realistic fake data for immediate testing and evaluation.

#### Quick Demo Setup

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Populate demo data
docker-compose exec backend npm run seed:demo

# 3. Start mobile app
npx expo start

# 4. Set mobile app to use Docker backend
# In your mobile .env file:
EXPO_PUBLIC_API_URL=http://localhost:3000
```

#### Demo Data Includes

- **2 Demo Brands**: "Green Leaf Demo" and "Sample Dispensary"
- **3 Demo Stores**: Realistic addresses in CA and AZ
- **10+ Demo Products**: Flower, edibles, vapes, concentrates, pre-rolls
- **5 Demo Users**: Complete profiles with order history
- **Sample Orders**: Recent purchase history and loyalty data
- **Compliance Rules**: State-specific THC limits and age verification

#### Demo Credentials

| User Type | Email                      | Password  | Description                  |
| --------- | -------------------------- | --------- | ---------------------------- |
| **Admin** | `demo+admin@example.com`   | `demo123` | Full admin access            |
| **User**  | `demo+user@example.com`    | `demo123` | Regular customer             |
| **User**  | `demo+sarah@example.com`   | `demo123` | Customer with order history  |
| **User**  | `demo+mike@example.com`    | `demo123` | Customer with loyalty points |
| **User**  | `demo+jessica@example.com` | `demo123` | New customer profile         |

#### Demo Commands

```bash
# Verbose demo seeding (see detailed progress)
docker-compose exec backend npm run seed:demo:verbose

# Clean demo data and reseed
docker-compose exec backend npm run seed:demo

# Check demo data in database
docker-compose exec db psql -U jars -d jars_dev -c "SELECT name, email FROM \"User\" WHERE email LIKE '%demo%';"
```

#### Testing Scenarios

1. **User Registration & Login**
   - Try registering a new account
   - Log in with existing demo credentials

2. **Product Browsing & Search**
   - Browse different product categories
   - Use search and filtering features
   - View detailed product information

3. **Shopping Cart & Checkout**
   - Add products to cart
   - Modify quantities and remove items
   - Complete checkout process

4. **Order Management**
   - View order history
   - Check order status updates
   - Reorder previous purchases

5. **Compliance Testing**
   - Test age verification requirements
   - Try exceeding daily THC limits
   - Verify state-specific restrictions

6. **Store Features**
   - Switch between demo stores
   - Check store hours and locations
   - View store-specific inventory

#### Demo Reset

To reset and refresh all demo data:

```bash
# Clear existing data and reseed
docker-compose exec backend npm run seed:demo
```

## �🌍 Production Deployment Options

### Cloud Platforms

1. **AWS ECS/Fargate**
2. **Google Cloud Run**
3. **Azure Container Instances**
4. **DigitalOcean App Platform**
5. **Railway** (database-as-a-service)
6. **Render** (full-stack platform)

### Self-Hosted

1. **VPS with Docker Compose** (simplest)
2. **Kubernetes cluster** (scalable)
3. **Docker Swarm** (multi-node)

## 📞 Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting) above
2. Review service logs: `docker-compose logs -f [service-name]`
3. Verify environment configuration in `.env` file
4. Ensure Docker Desktop is running and updated

---

**Happy deploying!** 🚀 Your JARS Cannabis Mobile App backend should now be running smoothly with Docker Compose.
