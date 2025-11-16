# Production Deployment Checklist

## 🚀 Pre-Deployment Checklist

### ✅ Environment Configuration

- [ ] **Copy `.env.production.template` to `.env.production`**
- [ ] **Fill in all required production values:**
  - [ ] Database URLs and credentials
  - [ ] Redis connection details
  - [ ] JWT secret (generate new one)
  - [ ] Stripe API keys (live keys)
  - [ ] Firebase service account credentials
  - [ ] OpenAI API key
  - [ ] Sentry DSN for error tracking
  - [ ] CORS origins (your production domains)

### ✅ Database Setup

- [ ] **Create production PostgreSQL database**
- [ ] **Run database migrations:**
  ```bash
  npx prisma migrate deploy
  ```
- [ ] **Generate Prisma client:**
  ```bash
  npx prisma generate
  ```
- [ ] **Seed with initial data (optional):**
  ```bash
  npm run seed
  ```

### ✅ Security Configuration

- [ ] **Generate secure JWT secret:**
  ```bash
  openssl rand -base64 32
  ```
- [ ] **Set strong database passwords**
- [ ] **Configure firewall rules**
- [ ] **Enable SSL/TLS certificates**
- [ ] **Set up Redis password protection**

### ✅ External Services Setup

- [ ] **Stripe Account Setup:**
  - [ ] Create live Stripe account
  - [ ] Configure webhooks
  - [ ] Test payment processing
  - [ ] Set up webhook endpoints

- [ ] **Firebase Project Setup:**
  - [ ] Create production Firebase project
  - [ ] Generate service account key
  - [ ] Configure authentication settings
  - [ ] Set up Firestore security rules

- [ ] **Sentry Error Tracking:**
  - [ ] Create Sentry project
  - [ ] Configure error tracking
  - [ ] Test error reporting

## 🏗️ Infrastructure Deployment

### Option 1: Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=your-database-url
# ... set all other environment variables

# Deploy
railway up
```

### Option 2: Render Deployment

1. **Connect GitHub repository to Render**
2. **Create PostgreSQL database on Render**
3. **Create Redis instance on Render**
4. **Create web service with:**
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
   - Environment variables from `.env.production`

### Option 3: DigitalOcean App Platform

```yaml
# app.yaml
name: jars-cannabis-app
services:
  - name: backend
    source_dir: /
    github:
      repo: your-username/jars-cannabis-mobile-app
      branch: main
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
databases:
  - name: jars-db
    engine: PG
    version: '15'
```

### Option 4: Docker Production Deployment

```bash
# Build for production
docker build -f backend/Dockerfile.prod -t jars-backend:latest ./backend

# Run with production environment
docker run -d \
  --name jars-backend \
  --env-file .env.production \
  -p 3000:3000 \
  jars-backend:latest
```

## 📱 Mobile App Deployment

### iOS App Store

```bash
# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### Google Play Store

```bash
# Build for Android
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

### Environment Configuration for Mobile

Create `apps/mobile/.env.production`:

```bash
EXPO_PUBLIC_API_URL=https://your-backend-url.com
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
EXPO_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
```

## 🔍 Post-Deployment Verification

### ✅ Health Checks

- [ ] **API Health Check:**
  ```bash
  curl https://your-api-url.com/api/v1/health
  ```
- [ ] **Database Connectivity:**
  ```bash
  curl https://your-api-url.com/api/v1/stores
  ```
- [ ] **Authentication Flow:**
  - [ ] User registration works
  - [ ] Login/logout functions
  - [ ] Password reset works

### ✅ E-commerce Flow Testing

- [ ] **Product Catalog:**
  - [ ] Products load correctly
  - [ ] Search and filtering work
  - [ ] Product details display
- [ ] **Shopping Cart:**
  - [ ] Add/remove items
  - [ ] Quantity updates
  - [ ] Cart persistence
- [ ] **Checkout Process:**
  - [ ] Payment processing (with test transactions)
  - [ ] Order creation and tracking
  - [ ] Email confirmations

### ✅ Cannabis Compliance Testing

- [ ] **Age Verification:**
  - [ ] 21+ enforcement works
  - [ ] Underage users blocked
- [ ] **THC Limits:**
  - [ ] Daily limits enforced
  - [ ] Multi-state rules work
  - [ ] Order rejection for violations

### ✅ Performance Monitoring

- [ ] **Response Times:**
  - [ ] API endpoints < 200ms
  - [ ] Database queries optimized
  - [ ] Image loading performance
- [ ] **Error Monitoring:**
  - [ ] Sentry receiving errors
  - [ ] Error rates < 1%
  - [ ] Alert thresholds set

### ✅ Security Verification

- [ ] **SSL/TLS Configuration:**
  - [ ] HTTPS enforced
  - [ ] Certificate validity
  - [ ] Security headers present
- [ ] **API Security:**
  - [ ] Authentication required
  - [ ] Rate limiting active
  - [ ] CORS properly configured

## 🚨 Production Monitoring Setup

### Application Monitoring

```javascript
// Add to your production monitoring
const healthChecks = {
  database: () => prisma.$queryRaw`SELECT 1`,
  redis: () => redisClient.ping(),
  stripe: () => stripe.balance.retrieve(),
};

// Monitor key metrics
const metrics = {
  activeUsers: 'SELECT COUNT(*) FROM users WHERE last_active > NOW() - INTERVAL 1 DAY',
  dailyOrders: 'SELECT COUNT(*) FROM orders WHERE created_at > CURRENT_DATE',
  errorRate: 'Monitor via Sentry',
  responseTime: 'Monitor via application insights',
};
```

### Alerting Thresholds

- **Error rate > 5%** - Critical alert
- **Response time > 2s** - Warning alert
- **Database connections > 80%** - Warning alert
- **Failed payments > 10/hour** - Critical alert
- **Age verification failures** - Monitor for compliance

## 🔄 Maintenance & Updates

### Regular Maintenance Tasks

- [ ] **Weekly:**
  - [ ] Review error logs
  - [ ] Check performance metrics
  - [ ] Update dependencies (patch versions)
- [ ] **Monthly:**
  - [ ] Security audit
  - [ ] Database performance review
  - [ ] Cost optimization review
- [ ] **Quarterly:**
  - [ ] Compliance audit
  - [ ] Penetration testing
  - [ ] Disaster recovery testing

### Update Process

1. **Test in staging environment**
2. **Create database backup**
3. **Deploy during low-traffic hours**
4. **Monitor for 24 hours post-deployment**
5. **Rollback plan ready**

---

## ✅ Production Ready Confirmation

Once all checklist items are complete:

- [ ] **All services deployed and running**
- [ ] **Health checks passing**
- [ ] **Payment processing tested**
- [ ] **Compliance features verified**
- [ ] **Monitoring and alerting active**
- [ ] **Performance within acceptable limits**
- [ ] **Security measures in place**

**🎉 Your JARS Cannabis Mobile App is ready for production!**
