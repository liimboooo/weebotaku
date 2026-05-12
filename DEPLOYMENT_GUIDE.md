# Complete Deployment & Migration Guide

## 🚦 Quick Troubleshooting Decision Tree

### Issue: Can't Connect to Redis
```
Q: Is Redis running?
├─ NO → Start Redis (brew install redis; redis-server)
├─ YES → Next question

Q: Is REDIS_HOST correct in .env.local?
├─ NO → Update to correct host
├─ YES → Check REDIS_PORT

Q: Can you connect manually?
├─ redis-cli -h <host> -p <port> ping
├─ NO → Check firewall
└─ YES → Reinstall redis client library (npm install redis)
```

### Issue: Prisma Migration Failed
```
Q: Is DATABASE_URL correct?
├─ NO → Update to valid PostgreSQL URL
├─ YES → Next question

Q: Does database exist?
├─ NO → createdb animewch
├─ YES → Next question

Q: Run specific migration?
├─ npx prisma migrate resolve --rolled-back <migration_name>
└─ npx prisma migrate deploy
```

### Issue: Cloudinary Upload Not Working
```
Q: Are CLOUDINARY_* env vars set?
├─ NO → Get from dashboard.cloudinary.com
├─ YES → Next question

Q: Is upload signature endpoint working?
├─ NO → Check auth middleware
├─ YES → Verify upload preset in Cloudinary

Q: Does webhook receive events?
├─ Check Cloudinary dashboard → Settings → Webhooks
└─ Verify URL is publicly accessible
```

### Issue: Rate Limiting Blocking Requests
```
Q: What's the error message?
├─ 429 Too Many Requests → You've exceeded limit
├─ Check X-RateLimit-Reset header
└─ Increase RATE_LIMIT_MAX_REQUESTS in .env

Q: Want to disable rate limiting?
├─ Development: Comment out rate limiting middleware
└─ Production: Keep enabled, increase limits for trusted IPs
```

### Issue: Bounty Not Updating After Action
```
Q: Check Redis connection
├─ redis-cli ping → PONG?
└─ If no → Restart Redis

Q: Check logs for errors
├─ npm run dev → Look for errors in console
├─ Check logs/error.log
└─ Look in Sentry dashboard

Q: Did action trigger?
├─ Like added → Check likes count increased
├─ Comment added → Check comments count
├─ Daily login → Check streak incremented
```

---

## 📋 Step-by-Step Setup

### Absolute Beginner (No Backend Experience)

**Step 1: Install Node.js**
```bash
# Go to nodejs.org, download LTS
node --version  # Should be v18 or higher
npm --version   # Should be v8 or higher
```

**Step 2: Clone and Install**
```bash
cd animewch
npm install
```

**Step 3: Get Database Ready**
```bash
# Install PostgreSQL (brew install postgresql on Mac)
# Start PostgreSQL service
# Create database:
createdb animewch
```

**Step 4: Configure Environment**
```bash
cp .env.local.example .env.local
# Edit .env.local with:
# DATABASE_URL="postgresql://localhost/animewch"
# NEXTAUTH_SECRET="$(openssl rand -base64 32)"
```

**Step 5: Setup Database**
```bash
npx prisma migrate dev --name init
```

**Step 6: Get Cloudinary Account**
```bash
# Visit cloudinary.com, sign up free
# Copy API keys to .env.local:
# NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
# CLOUDINARY_API_KEY=...
# CLOUDINARY_API_SECRET=...
```

**Step 7: Start Development**
```bash
npm run dev
# Visit http://localhost:3000
```

---

## 🔄 Migration from Existing Backend

### From MongoDB to PostgreSQL

**Files to Create:**
- Copy all files from `src/services/` (new)
- Copy all files from `src/lib/` (new)
- Update all API routes in `pages/api/`

**Steps:**

1. **Setup PostgreSQL**
   ```bash
   # Install PostgreSQL if not already installed
   brew install postgresql
   createdb animewch
   ```

2. **Update .env.local**
   ```env
   # Change from:
   MONGODB_URI="mongodb://..."
   
   # To:
   DATABASE_URL="postgresql://user:pass@localhost:5432/animewch"
   ```

3. **Install Prisma**
   ```bash
   npm install @prisma/client prisma
   ```

4. **Generate Prisma Schema**
   ```bash
   # Copy prisma/schema.prisma from this project
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. **Migrate Data (if needed)**
   ```typescript
   // scripts/migrate-data.ts
   import { MongoClient } from 'mongodb';
   import { prisma } from '@/lib/prisma';
   
   const mongoClient = new MongoClient(process.env.MONGODB_URI);
   const mongoDB = mongoClient.db('animewch');
   
   // Migrate users
   const users = await mongoDB.collection('users').find({}).toArray();
   for (const user of users) {
     await prisma.user.create({
       data: {
         email: user.email,
         name: user.name,
         // ... map fields
       }
     });
   }
   
   await mongoClient.close();
   ```

6. **Replace Services**
   - Remove old Mongoose models
   - Add new Prisma services from `src/services/`
   - Update API routes to use new services

7. **Test**
   ```bash
   npm run dev
   npm test
   ```

### From Express to Next.js

**Key Differences:**
- No separate server file - Next.js handles it
- API routes in `pages/api/` instead of `routes/`
- Middleware is built-in
- No need for body-parser (automatic)
- No need for CORS middleware (configurable)

**Migration Steps:**

1. **Move API Routes**
   ```typescript
   // Old: routes/users.js
   app.get('/users/:id', (req, res) => { ... });
   
   // New: pages/api/users/[id].ts
   export default async function handler(req, res) {
     if (req.method === 'GET') { ... }
   }
   ```

2. **Move Middleware**
   ```typescript
   // Create pages/api/middleware/auth.ts
   // Use as wrapper function, not Express middleware
   ```

3. **Environment Setup**
   - Copy `.env.local.example` to `.env.local`
   - Add all credentials

4. **Database**
   - Install Prisma: `npm install @prisma/client prisma`
   - Create schema.prisma
   - Run migrations

---

## 🎯 Feature Checklist by Priority

### Phase 1: Core (Week 1)
- [ ] Database setup (PostgreSQL + Prisma)
- [ ] Authentication (NextAuth.js)
- [ ] User profiles (CRUD)
- [ ] Basic CRUD for edits

**Endpoint Count**: 10
**Time**: ~40 hours

### Phase 2: Video (Week 2)
- [ ] Cloudinary integration
- [ ] Video upload
- [ ] Multi-res transcoding
- [ ] HLS/DASH streaming

**Endpoint Count**: +5
**Time**: ~30 hours

### Phase 3: Social (Week 3)
- [ ] Like/unlike
- [ ] Comments
- [ ] Follow/unfollow
- [ ] Watchlist

**Endpoint Count**: +8
**Time**: ~25 hours

### Phase 4: Gamification (Week 4)
- [ ] Bounty system
- [ ] Daily streaks
- [ ] Leaderboards

**Endpoint Count**: +3
**Time**: ~35 hours

### Phase 5: Discovery (Week 5)
- [ ] Trending algorithm
- [ ] Search
- [ ] Filtering
- [ ] Categories

**Endpoint Count**: +4
**Time**: ~20 hours

### Phase 6: Real-time (Week 6)
- [ ] Redis pub/sub
- [ ] Notifications
- [ ] Activity feed
- [ ] WebSocket (optional)

**Endpoint Count**: +2
**Time**: ~20 hours

### Phase 7: DevOps (Week 7)
- [ ] Cron jobs
- [ ] Logging (Winston)
- [ ] Error tracking (Sentry)
- [ ] Deployment

**Time**: ~15 hours

**Total**: ~185 hours (~4.6 weeks full-time)

---

## 🔧 Common Configuration Scenarios

### Scenario 1: Local Development (No Services)

```env
DATABASE_URL=postgresql://localhost/animewch
REDIS_HOST=localhost
REDIS_PORT=6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret
LOG_LEVEL=debug
```

**Services disabled**: Cloudinary (mock), Sentry (local only)

### Scenario 2: Development with Services

```env
DATABASE_URL=postgresql://localhost/animewch
REDIS_HOST=redis-cloud-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
SENTRY_DSN=https://key@sentry.io/project
```

### Scenario 3: Production

```env
DATABASE_URL=postgresql://prod-user:secure-pass@prod-db-host:5432/animewch
REDIS_HOST=redis-cluster-endpoint
REDIS_PORT=6379
REDIS_PASSWORD=strong-password
REDIS_TLS=true
CLOUDINARY_CLOUD_NAME=prod-cloud
CLOUDINARY_API_KEY=prod-key
CLOUDINARY_API_SECRET=prod-secret
NEXTAUTH_URL=https://animewch.com
NEXTAUTH_SECRET=production-secret-key
SENTRY_DSN=https://prod-key@sentry.io/prod-project
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 📊 Performance Tuning Checklist

### Database
- [ ] Indexes created on hot paths
- [ ] Connection pooling configured
- [ ] Query timeouts set
- [ ] Slow query logging enabled

### Cache
- [ ] Redis memory limits set
- [ ] Eviction policy configured (LRU)
- [ ] TTL strategy implemented
- [ ] Cache hit rate monitoring

### Application
- [ ] Response compression enabled
- [ ] Static asset caching configured
- [ ] Database query optimization done
- [ ] N+1 query problems resolved

### Monitoring
- [ ] Error tracking active (Sentry)
- [ ] Performance monitoring enabled
- [ ] Alerts configured
- [ ] Logs rotated

---

## 🐳 Docker Compose Setup

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: animewch
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/animewch
      REDIS_HOST: redis
      REDIS_PORT: 6379
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

**Run with:**
```bash
docker-compose up
```

---

## 🚀 Deployment Commands

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
# Follow prompts
```

### AWS Elastic Beanstalk
```bash
eb init
eb create animewch-env
eb deploy
```

### DigitalOcean App Platform
```bash
# Push to GitHub
# Connect repo to DigitalOcean App Platform
# Auto-deploys on push to main
```

### Manual VM Deployment
```bash
# SSH into server
ssh user@server.com

# Clone repo
git clone https://github.com/user/animewch.git
cd animewch

# Install dependencies
npm install

# Build
npm run build

# Setup environment
nano .env.local  # Add credentials

# Start with PM2
npm install -g pm2
pm2 start npm --name "animewch" -- start
pm2 save
pm2 startup
```

---

## 📈 Growth Milestones

| Phase | Users | Content | Bounty Range |
|-------|-------|---------|--------------|
| Beta | 100 | 1K | 0-100K |
| Launch | 1K | 10K | 0-1M |
| Growth | 10K | 100K | 0-10M |
| Scale | 100K | 1M | 0-100M |
| Enterprise | 1M+ | 10M+ | 0-1B+ |

**Performance Requirements per Phase:**
- **Beta**: Local development sufficient
- **Launch**: 1x production server + managed database
- **Growth**: Database replication + Redis cluster
- **Scale**: Multi-region + CDN
- **Enterprise**: Full infrastructure with redundancy

---

## 🔐 Security Hardening Checklist

### Authentication
- [ ] Require strong passwords (8+ chars, mixed case, numbers, symbols)
- [ ] Implement 2FA for admin accounts
- [ ] Use JWT with short expiration
- [ ] Refresh tokens in secure HTTP-only cookies

### API Security
- [ ] Rate limiting on all public endpoints
- [ ] CORS properly configured
- [ ] All inputs validated
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled

### Infrastructure
- [ ] SSL/TLS certificate installed
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Firewall rules set up
- [ ] DDoS protection enabled

### Data Protection
- [ ] Database encrypted at rest
- [ ] Backups encrypted
- [ ] Logs don't contain sensitive data
- [ ] PII handled carefully (GDPR compliant)

### Monitoring
- [ ] Error tracking active
- [ ] Intrusion detection configured
- [ ] Audit logs enabled
- [ ] Alerts set for suspicious activity

---

## 📱 API Integration Checklist

### Frontend Requirements
- [ ] Store JWT tokens securely
- [ ] Handle 401/403 errors
- [ ] Retry on network failure
- [ ] Show error messages to user
- [ ] Handle rate limiting (429)

### Testing
- [ ] Test all HTTP methods
- [ ] Test all response codes
- [ ] Test error cases
- [ ] Load test endpoints
- [ ] Security test inputs

### Monitoring
- [ ] Track API response times
- [ ] Monitor error rates
- [ ] Log all requests
- [ ] Alert on failures
- [ ] Capacity planning

---

## 💾 Data Backup Strategy

### Backup Frequency
- **Development**: Not needed
- **Staging**: Daily
- **Production**: Hourly

### Backup Types
- **Full Backup**: Weekly
- **Incremental**: Daily
- **Transaction Log**: Continuous

### Recovery Testing
- [ ] Test restore from backup monthly
- [ ] Document recovery process
- [ ] Calculate RTO/RPO
- [ ] Plan for disaster recovery

---

## 📞 Support Matrix

| Issue | Level | Response Time |
|-------|-------|----------------|
| Application down | Critical | 15 min |
| Database down | Critical | 15 min |
| API errors > 5% | High | 1 hour |
| Performance degradation | Medium | 4 hours |
| Feature request | Low | 24 hours |

**Escalation Path:**
Development Team → Tech Lead → CTO → Vendors

---

## 🎓 Learning Resources

### Prerequisites
- JavaScript/TypeScript: https://www.typescriptlang.org/docs/
- React: https://react.dev
- PostgreSQL: https://www.postgresql.org/docs/
- REST APIs: https://developer.mozilla.org/en-US/docs/Web/HTTP

### Advanced Topics
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs/
- Redis: https://redis.io/docs/
- Authentication: https://next-auth.js.org

### Best Practices
- Clean Code: https://cleancode.dev
- API Design: https://restfulapi.net
- Database Design: https://database.guide
- Security: https://owasp.org/www-project-top-ten/

---

## ✅ Final Deployment Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database backed up
- [ ] SSL certificate installed
- [ ] Monitoring and alerts set up
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Support team trained
- [ ] Rollback plan documented
- [ ] Staging deployment successful

**Estimated time to full deployment**: 2-4 weeks from dev-ready code

---

**Last Updated**: January 2025
