# Advanced Backend Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Core dependencies
npm install redis argon2 winston @sentry/nextjs

# Optional: For real-time WebSocket support
npm install pusher pusher-js socket.io

# Development tools
npm install -D ts-node @types/node
```

### 2. Update package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "node scripts/seed.ts",
    
    "cron:streaks": "node scripts/cron/reset-streaks.ts",
    "cron:trending": "node scripts/cron/update-trending.ts",
    
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

### 3. Environment Setup

Copy and configure environment variables:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/animewch"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# NextAuth
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"

# Sentry (optional)
SENTRY_DSN="https://your-key@sentry.io/project-id"

# Logging
LOG_LEVEL="debug"
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed initial data
npx prisma db seed
```

### 5. Redis Setup

#### Local Development
```bash
# Install Redis (macOS)
brew install redis

# Start Redis server
redis-server

# Test connection
redis-cli ping
# Output: PONG
```

#### Docker Setup
```bash
# Run Redis in Docker
docker run -d -p 6379:6379 redis:latest

# Or use docker-compose
version: '3'
services:
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### 6. Cloudinary Webhook Configuration

1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Settings → Webhooks
3. Add webhook:
   - **URL**: `https://yourdomain.com/api/webhooks/cloudinary`
   - **Events**: `upload_complete`, `transcoding_complete`, `error`
   - **Format**: JSON

### 7. Create Logs Directory

```bash
mkdir -p logs
touch logs/error.log logs/all.log
```

### 8. Run Development Server

```bash
npm run dev

# Server runs on http://localhost:3000
```

---

## Advanced Configuration

### Redis Configuration

#### Production Setup (with Authentication)

```typescript
// src/lib/redis.ts
export async function getRedisClient() {
  const redis = createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || "6379"),
      tls: process.env.REDIS_TLS === "true", // Enable TLS
    },
    password: process.env.REDIS_PASSWORD, // Add password
    db: parseInt(process.env.REDIS_DB || "0"),
    retryStrategy: (retries) => {
      if (retries > 10) return null;
      return Math.min(retries * 50, 2000);
    },
  });

  return redis;
}
```

#### Redis Memory Limits

```bash
# Configure memory limit in redis.conf
maxmemory 256mb                 # Max memory
maxmemory-policy allkeys-lru    # Eviction policy
```

### Sentry Configuration

#### Setup Error Tracking

1. Create [Sentry.io account](https://sentry.io)
2. Create new project (Next.js)
3. Get DSN from project settings
4. Add to `.env.local`:
   ```env
   SENTRY_DSN="https://your-key@your-org.sentry.io/project-id"
   ```

#### Custom Error Tracking

```typescript
// pages/api/example.ts
import { captureException, log } from "@/lib/logger";

export default async function handler(req, res) {
  try {
    // Your code
  } catch (error) {
    log.error("Custom error message", error, { context: "example-endpoint" });
    // Error automatically sent to Sentry
    res.status(500).json({ error: "Internal Server Error" });
  }
}
```

### Cron Jobs Setup

#### Using node-cron (Embedded)

```typescript
// src/jobs/scheduler.ts
import cron from "node-cron";
import { StreakService } from "@/services/streak.service";
import { TrendingService } from "@/services/trending.service";

export function initScheduler() {
  // Reset streaks daily at 00:00 UTC
  cron.schedule("0 0 * * *", async () => {
    console.log("Running streak reset...");
    await StreakService.processStreakResets();
  });

  // Update trending every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("Updating trending scores...");
    await TrendingService.updateTrendingScores();
  });

  console.log("✅ Cron scheduler initialized");
}

// Initialize in pages/api/cron/init.ts or in _app.tsx
```

#### Using External Service (Recommended for Production)

**Option 1: GitHub Actions**
```yaml
# .github/workflows/cron.yml
name: Cron Jobs
on:
  schedule:
    - cron: "0 0 * * *"  # Daily reset
    - cron: "*/15 * * * *" # Every 15 minutes

jobs:
  cron:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Reset Streaks
        run: |
          curl -X POST https://yourdomain.com/api/cron/reset-streaks \
            -H "X-API-KEY: ${{ secrets.CRON_API_KEY }}"
```

**Option 2: Vercel Cron Functions**
```typescript
// pages/api/cron/reset-streaks.ts
import { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  // Verify the request comes from Vercel
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { StreakService } = await import("@/services/streak.service");
  await StreakService.processStreakResets();

  res.json({ success: true });
};
```

---

## API Integration Examples

### Create Edit with Video Upload

```typescript
// Frontend: Upload video and create edit
const uploadVideo = async (file: File, title: string) => {
  // 1. Get upload signature
  const signRes = await fetch("/api/edits/upload/signature", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
  });
  const { timestamp, signature, uploadPreset, cloudName } = await signRes.json();

  // 2. Upload to Cloudinary (client-side)
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", "animewch/edits");

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    { method: "POST", body: formData }
  );
  const { public_id, secure_url, duration } = await uploadRes.json();

  // 3. Create edit record
  const editRes = await fetch("/api/edits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      videoUrl: secure_url,
      videoPublicId: public_id,
      duration,
      tags: ["anime", "edit"],
      categoryIds: ["cat123"],
    }),
  });

  return await editRes.json();
};
```

### Real-Time Notifications (Client)

```typescript
// Frontend: Subscribe to notifications
import { useEffect } from "react";

export function useNotifications(userId: string) {
  useEffect(() => {
    const eventSource = new EventSource(`/api/notifications/stream?userId=${userId}`);

    eventSource.onmessage = (e) => {
      const notification = JSON.parse(e.data);

      switch (notification.type) {
        case "like":
          console.log(`${notification.data.liker.name} liked your edit`);
          break;
        case "follow":
          console.log(`${notification.data.follower.name} started following you`);
          break;
        case "milestone":
          console.log(`You reached ${notification.data.newRank} rank!`);
          break;
      }
    };

    return () => eventSource.close();
  }, [userId]);
}
```

### Trending & Discovery

```typescript
// Fetch trending edits
const getTrending = async () => {
  const res = await fetch("/api/trending?limit=50&timeframe=24h");
  return res.json();
};

// Fetch by category with filters
const getFiltered = async () => {
  const params = new URLSearchParams({
    tags: "Action,Seinen",
    categories: "Anime",
    sortBy: "trending",
    limit: "30",
  });

  const res = await fetch(`/api/edits/filtered?${params}`);
  return res.json();
};

// Get top creators
const getTopCreators = async () => {
  const res = await fetch("/api/trending/creators?limit=20");
  return res.json();
};
```

---

## Performance Tuning

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_edit_trending ON Edit(trendingScore DESC, createdAt DESC);
CREATE INDEX idx_user_bounty ON "User"(totalBounty DESC, bountyRank);
CREATE INDEX idx_activity_log_user_date ON ActivityLog(userId, createdAt DESC);
```

### Redis Optimization

```bash
# Monitor Redis memory usage
redis-cli INFO memory

# Check eviction policy
redis-cli CONFIG GET maxmemory-policy

# Optimize for caching
redis-cli CONFIG SET maxmemory 512mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Query Optimization

```typescript
// Use select() to limit fields
await prisma.edit.findMany({
  select: {
    id: true,
    title: true,
    trendingScore: true,
    creator: {
      select: { name: true, image: true }
    }
  }
});

// Use pagination
const PAGE_SIZE = 20;
const page = 1;
await prisma.edit.findMany({
  skip: (page - 1) * PAGE_SIZE,
  take: PAGE_SIZE,
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] Redis connection verified
- [ ] Cloudinary webhook configured
- [ ] Sentry DSN configured
- [ ] Rate limiting configured
- [ ] CORS settings configured
- [ ] Security headers enabled

### During Deployment

- [ ] Build succeeds: `npm run build`
- [ ] No errors in build output
- [ ] Environment variables set in hosting platform
- [ ] Database connection string correct
- [ ] Redis connection string correct

### Post-Deployment

- [ ] Health check: `GET /api/health`
- [ ] Test user authentication
- [ ] Test video upload
- [ ] Monitor error logs
- [ ] Check Sentry for errors
- [ ] Verify real-time notifications working

---

## Troubleshooting

### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping

# Check port
lsof -i :6379

# Test connection from app
redis-cli -h localhost -p 6379 ping
```

### Cloudinary Upload Failed

```bash
# Check API credentials
curl -u "your-key:your-secret" \
  "https://api.cloudinary.com/v1_1/your-cloud/resource_types"

# Verify upload preset exists
# Check webhook configuration in dashboard
```

### Prisma Migration Failed

```bash
# Reset database (dev only!)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

### High Redis Memory Usage

```bash
# Check largest keys
redis-cli --bigkeys

# Clear specific pattern
redis-cli DEL $(redis-cli KEYS 'pattern:*')
```

---

## Performance Benchmarks

### Expected Performance Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| API response time | <200ms | Cached responses <50ms |
| Video streaming | <2s startup | HLS adaptive bitrate |
| Search query | <500ms | Full-text search |
| Trending calculation | <30s | Every 15 minutes |
| User bounty update | <100ms | On each action |
| Real-time notification | <100ms | Redis pub/sub |

### Load Test Results (Example)

```
Concurrent users: 1000
Request rate: 10,000 req/min
API latency p99: 250ms
Video streaming: 4500 Mbps bandwidth
Cache hit rate: 85%
Database connection pool utilization: 60%
```

---

## Next Steps

1. [Configure Cloudinary webhooks](#cloudinary-webhook-configuration)
2. [Set up monitoring](#production-checklist)
3. [Deploy to production](#deployment-checklist)
4. [Monitor performance](#monitoring)

For more details, see [ADVANCED_FEATURES.md](./ADVANCED_FEATURES.md)
