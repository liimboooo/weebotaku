# AnimeWch Backend - Advanced Features Documentation

## Table of Contents
1. [Video Infrastructure & Transcoding](#video-infrastructure--transcoding)
2. [Real-time Engine (WebSockets/Pusher)](#real-time-engine-websocketspusher)
3. [Bounty & Streak Gamification](#bounty--streak-gamification)
4. [Trending Algorithm](#trending-algorithm)
5. [Security & Performance](#security--performance)
6. [Caching Strategy](#caching-strategy)
7. [Deployment & DevOps](#deployment--devops)

---

## Video Infrastructure & Transcoding

### Overview
The backend uses Cloudinary for video hosting with automatic transcoding to multiple resolutions and HLS/DASH streaming support.

### Multi-Resolution Transcoding
Videos are automatically transcoded to:
- **480p** - For mobile/low bandwidth (0.5-1 Mbps)
- **720p** - Standard HD (1-3 Mbps)
- **1080p** - Full HD (3-5 Mbps)
- **4K** - Ultra HD (8+ Mbps, optional)

### Animated GIF Thumbnail
Auto-generated GIF thumbnails at 300x300px:
```typescript
// Automatic GIF generation via Cloudinary
// URL pattern: https://res.cloudinary.com/{cloud}/video/upload/fl_animated,c_scale,w_300,h_300/{public_id}.gif
```

### HLS Streaming (Adaptive Bitrate)
HTTP Live Streaming manifest for client-side adaptive bitrate selection:
```typescript
// HLS Manifest URL
const hlsUrl = `https://res.cloudinary.com/${cloudName}/video/upload/fl_streaming_hls,c_limit,h_1080,w_1920/${videoId}.m3u8`;

// Usage in HTML5 Video
<video>
  <source src={hlsUrl} type="application/x-mpegURL" />
</video>
```

### DASH Streaming
DASH (Dynamic Adaptive Streaming over HTTP) for advanced players:
```typescript
const dashUrl = `https://res.cloudinary.com/${cloudName}/video/upload/fl_streaming_dash,c_limit,h_1080,w_1920/${videoId}.mpd`;
```

### Webhook Integration
Cloudinary sends webhooks to `/api/webhooks/cloudinary` on transcoding completion:
```typescript
// TranscodingService.handleTranscodingWebhook(payload)
// Updates Edit model with:
// - processingStatus: "completed"
// - transcodedVersions: { "720p": url, "1080p": url, ... }
// - hlsManifestUrl: streaming URL
// - dashManifestUrl: streaming URL
// - animatedGif: thumbnail URL
```

### API Endpoints

#### Upload Signature Generation
```bash
POST /api/edits/upload/signature
Authorization: Bearer {token}

Response:
{
  "timestamp": 1234567890,
  "signature": "abc123...",
  "uploadPreset": "animewch_edits",
  "cloudName": "your-cloud"
}
```

#### Check Transcoding Status
```bash
GET /api/edits/{editId}/transcoding

Response:
{
  "status": "completed",
  "transcodedVersions": {
    "480p": "https://...",
    "720p": "https://...",
    "1080p": "https://..."
  },
  "hlsUrl": "https://.../video.m3u8",
  "dashUrl": "https://.../video.mpd",
  "progress": 100
}
```

---

## Real-time Engine (WebSockets/Pusher)

### Architecture
Real-time notifications use Redis pub/sub with optional Pusher integration for WebSocket fallback.

### Notification Types

#### 1. Like Notification
Sent when someone likes a user's edit:
```typescript
await RealtimeService.notifyLike(
  creatorId,
  { id: likerId, name: "Jane", image: "url" },
  { id: editId, title: "Cool Edit" }
);

// Notification data:
{
  type: "like",
  recipientId: creatorId,
  data: {
    liker: { id, name, image },
    edit: { id, title },
    message: "Jane liked your edit: Cool Edit"
  },
  timestamp: new Date()
}
```

#### 2. Comment Notification
Sent when someone comments on a user's edit:
```typescript
await RealtimeService.notifyComment(
  creatorId,
  commenter,
  edit,
  { id: commentId, content: "Amazing work!" }
);
```

#### 3. Follow Notification
Sent when someone follows a user:
```typescript
await RealtimeService.notifyFollow(
  followingId,
  { id: followerId, name: "John", image: "url" }
);
```

#### 4. Milestone Notification
Sent when user reaches new Bounty Rank:
```typescript
await RealtimeService.notifyMilestone(
  userId,
  "rank",
  { oldRank: "Silver", newRank: "Gold" }
);
```

#### 5. Global Activity Feed
Real-time feed showing recent uploads and trends:
```typescript
// Subscribe to global feed
await RealtimeService.subscribeToGlobalFeed((event) => {
  console.log("Activity:", event);
});

// Returns events like:
{
  type: "global_activity",
  data: {
    action: "new_upload",
    creator: { id, name, image },
    edit: { title, duration },
    editId
  }
}
```

### Redis Channels
```typescript
// User notifications
notifications:{userId}

// Global activity
activity:global

// Trending updates
trending:updates

// Bounty changes
bounty:{userId}

// Live streams
stream:{userId}
```

### Client-Side Integration

#### Using Server-Sent Events (SSE)
```typescript
// src/hooks/useNotifications.ts
export function useNotifications() {
  useEffect(() => {
    const eventSource = new EventSource('/api/notifications/stream');
    
    eventSource.onmessage = (e) => {
      const notification = JSON.parse(e.data);
      // Handle notification
    };
    
    return () => eventSource.close();
  }, []);
}
```

#### Using WebSocket (with Pusher)
```typescript
import Pusher from 'pusher-js';

const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
});

const channel = pusher.subscribe(`notifications-${userId}`);
channel.bind('like', (data) => {
  // Handle like notification
});
```

---

## Bounty & Streak Gamification

### Bounty Calculation Formula
```
Total Bounty = (Total Likes × 10) + (Total Comments × 5) + (Daily Logins × 50) + (Uploads × 500)
```

### Bounty Ranks
| Rank | Bounty Range | Benefits |
|------|------------|----------|
| Bronze | 0 - 99,999 | Basic features |
| Silver | 100,000 - 999,999 | Verified badge |
| Gold | 1M - 9,999,999 | Featured in trending |
| Platinum | 10M - 99,999,999 | Priority support |
| Diamond | 100M - 1,499,999,999 | Admin consultation |
| INFINITE | 1.5B+ | Legendary status |

### Service: BountyService

#### Update Bounty
```typescript
// Automatically called when user likes, comments, uploads, or logs in
await BountyService.updateBounty(userId);

// Returns:
{
  totalBounty: BigInt(5000000),
  bountyRank: "Gold"
}
```

#### Recalculate on Actions
```typescript
// On like added
await BountyService.onLikeAdded(creatorId);

// On comment added
await BountyService.onCommentAdded(creatorId);

// On upload
await BountyService.onUploadAdded(userId);
```

### Streak System

#### Daily Login Tracking
```typescript
// Called on user login
const streak = await StreakService.updateDailyStreak(userId);

// Returns: current streak count
```

#### Streak Logic
- Increments if user logs in on consecutive days
- Resets to 1 if >24 hours since last login
- Optional streak freeze for premium users (extends freeze by 7 days)

#### Streak Milestones
Notifications at: 7, 14, 30, 60, 90, 100, 365 days

#### Streak Freeze (Premium Feature)
```typescript
// Freeze streak for 7 days
await StreakService.applyStreakFreeze(userId, 7);

// If user doesn't log in but has freeze:
// - Streak is preserved
// - Freeze extends when user logs in
```

#### Cron Job: Daily Reset
```typescript
// Should run daily at 00:00 UTC
// Call via: node scripts/reset-streaks.js
await StreakService.processStreakResets();

// Resets streaks for inactive users (>24h)
// Excludes frozen streaks
```

### Service: StreakService Methods

```typescript
// Get user's streak info
const streak = await StreakService.getStreak(userId);
// Returns:
{
  currentStreak: 45,
  longestStreak: 180,
  streakFrozen: false,
  frozenUntil?: new Date()
}

// Get leaderboard
const leaderboard = await StreakService.getStreakLeaderboard(50);
// Returns: top 50 users by current streak
```

---

## Trending Algorithm

### Algorithm Overview
The trending algorithm combines **velocity** (engagement per hour) with **recency** and **creator influence**.

### Scoring Formula
```
Trending Score = 
  (Likes per hour × 10) +
  (Comments per hour × 15) +
  (Views per hour × 1) +
  (Engagement Rate × 25) +
  Recency Boost (100 if <24h old) +
  (Creator Followers ÷ 100 × 5)
```

### Service: TrendingService

#### Get Trending Edits
```typescript
// Global trending (24 hours)
const trending = await TrendingService.getTrendingEdits(limit = 50, timeframeHours = 24);

// Returns:
[
  {
    editId: "abc123",
    title: "Amazing Edit",
    creator: "Jane",
    velocity: 45, // engagement per hour
    totalEngagement: 250,
    viewCount: 5000,
    likeCount: 120,
    commentCount: 130,
    recencyScore: 100,
    trendingScore: 8450,
    rank: 1
  }
]
```

#### Get Trending by Category
```typescript
const trending = await TrendingService.getTrendingByCategory(
  categorySlug = "action",
  limit = 30,
  timeframeHours = 24
);
```

#### Get Trending Creators
```typescript
const creators = await TrendingService.getTrendingCreators(limit = 20, timeframeHours = 24);

// Returns: creators with most engagement in timeframe
```

#### Advanced Multi-Tag Filtering
```typescript
// Filter edits by multiple tags and categories
const results = await TrendingService.getFilteredTrending(
  tags = ["Action", "Seinen"],
  categories = ["Anime", "Manga"],
  sortBy = "trending" // or "new", "popular"
);

// Returns: edits matching filters, sorted by trending score
```

#### Update Trending Scores (Cron Job)
```typescript
// Should run every 15 minutes
// Call via: node scripts/update-trending.js
await TrendingService.updateTrendingScores();

// Updates trendingScore for all published edits
// Updates Redis sorted set for quick access
```

---

## Security & Performance

### Password Hashing (Argon2)
```typescript
import { PasswordService } from "@/lib/security";

// Hash password on signup
const hashedPassword = await PasswordService.hashPassword(password);

// Verify on login
const isValid = await PasswordService.verifyPassword(password, hash);

// Validate password strength
const validation = PasswordService.validatePasswordStrength(password);
// Returns: { isValid: boolean, errors: string[] }
```

### Security Headers
All API responses include:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Input Sanitization
```typescript
import { InputValidator } from "@/lib/security";

// Sanitize user input
const cleanInput = InputValidator.sanitizeInput(userInput, maxLength = 1000);

// Validate email
const isValidEmail = InputValidator.validateEmail(email);

// Prevent SQL injection
const isSafe = InputValidator.preventSqlInjection(input);
```

### Rate Limiting
```typescript
import { RateLimiter } from "@/lib/security";

// Check if request is rate limited
if (RateLimiter.isLimited(key, maxRequests = 10, windowMs = 60000)) {
  return 429; // Too Many Requests
}

// Get retry-after time
const retryAfter = RateLimiter.getRetryAfter(key);
```

### Error Logging with Winston & Sentry
```typescript
import { log, initSentry, captureException } from "@/lib/logger";

// Initialize Sentry
initSentry();

// Log different levels
log.info("User signed up", { userId });
log.warn("High latency detected", { duration: 5000 });
log.error("Database error", error, { query });

// Capture exceptions to Sentry
captureException(error, { context: "user_signup" });

// Audit trail
log.audit(userId, "created", "edit", { editId });

// Security events
log.security("Failed login attempt", "low", { ip, attempts: 3 });
```

---

## Caching Strategy

### Redis Structure
```typescript
// Cache keys
user:{userId}:profile          // TTL: 30 min
user:{userId}:bounty           // TTL: 1 hour
user:{userId}:streak           // TTL: 1 hour
edit:{editId}                  // TTL: 15 min
popular_edits                  // TTL: 1 hour
trending:24h:50                // TTL: 15 min
trending:action:24h            // TTL: 15 min
trending_creators:24h          // TTL: 30 min
global_activity_feed:0         // TTL: 5 min
unread_notifications:{userId}  // TTL: 5 min
```

### Cache Invalidation
```typescript
// Invalidate user profile on update
await redis.invalidateUserProfile(userId);

// Update trending scores
await redis.updateTrendingScore(editId, score);

// Clear specific cache
await redis.del(key);

// Clear all trending caches
await redis.del([
  "popular_edits",
  "trending:24h:50",
  "trending_creators:24h"
]);
```

### Popular Edits Cache
```typescript
// Cache popular edits for homepage
await redis.cachePopularEdits(edits, durationSeconds = 3600);

// Retrieve
const cached = await redis.getPopularEdits();
```

### Sorted Sets for Trending
```typescript
// Add edit to trending sorted set
await redis.zadd("trending_edits", score, editId);

// Get top 50 trending
const trending = await redis.zrevrangebyscore("trending_edits", Infinity, 0, 50);
```

---

## Deployment & DevOps

### Environment Variables
```bash
# .env.local (copy from .env.local.example)

# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Real-time (optional)
PUSHER_APP_ID="..."
PUSHER_KEY="..."

# Logging
SENTRY_DSN="..."
LOG_LEVEL="debug"
```

### Setup Steps

#### 1. Install Dependencies
```bash
npm install
npm install redis argon2 winston sentry @sentry/nextjs
npm install --save-dev ts-node
```

#### 2. Setup Prisma
```bash
npx prisma generate
npx prisma migrate dev --name init
```

#### 3. Create Logs Directory
```bash
mkdir -p logs
```

#### 4. Configure Cron Jobs
Use `node-cron` or external service:

```typescript
// pages/api/cron/reset-streaks.ts
import cron from 'node-cron';
import { StreakService } from '@/services/streak.service';

// Run daily at 00:00 UTC
cron.schedule('0 0 * * *', async () => {
  await StreakService.processStreakResets();
});

// pages/api/cron/update-trending.ts
// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  await TrendingService.updateTrendingScores();
});
```

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Enable Sentry error tracking
- [ ] Configure Redis with password
- [ ] Setup Cloudinary webhooks to production domain
- [ ] Enable rate limiting on auth endpoints
- [ ] Configure CORS for production domain
- [ ] Setup database backups
- [ ] Monitor error logs and performance metrics
- [ ] Configure CDN for video playback
- [ ] Setup uptime monitoring

### Performance Optimization
- Video streaming uses Cloudinary CDN (global edge locations)
- Cache frequently accessed data in Redis
- Update trending scores periodically (not on every interaction)
- Batch database updates where possible
- Use connection pooling for database
- Monitor slow queries (>1000ms logged)

### Monitoring
- Sentry for error tracking
- Redis monitoring for cache hit rates
- Database query performance logging
- API response time metrics
- Transcoding pipeline health
- WebSocket/real-time connection stability

---

## Testing

### Unit Tests
```bash
npm run test:unit

# Test bounty calculation
npm run test -- bounty.service.test.ts

# Test trending algorithm
npm run test -- trending.service.test.ts
```

### Integration Tests
```bash
npm run test:integration

# Test video upload pipeline
npm run test -- transcoding.integration.test.ts

# Test real-time notifications
npm run test -- realtime.integration.test.ts
```

### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 100 http://localhost:3000/api/edits

# Monitor Redis
redis-cli MONITOR
```

---

## Troubleshooting

### Transcoding Stuck on "Processing"
- Check Cloudinary webhook configuration
- Verify webhook URL is accessible from internet
- Check Cloudinary API logs for errors
- Manually trigger webhook: `POST /api/webhooks/cloudinary`

### Real-time Notifications Not Working
- Verify Redis connection
- Check Pusher configuration (if using)
- Monitor Redis pub/sub: `redis-cli PSUBSCRIBE '*'`
- Check browser console for WebSocket errors

### Trending Algorithm Not Updating
- Run `npm run cron:trending` manually
- Check cron job scheduler is running
- Verify Redis sorted set: `redis-cli ZRANGE trending_edits 0 -1 WITHSCORES`

### Performance Issues
- Check Redis memory usage: `redis-cli INFO memory`
- Monitor database connections: check Prisma logs
- Review slow queries in Winston logs
- Scale Redis if cache hit rate is low

---

## References
- [Cloudinary Video Streaming](https://cloudinary.com/documentation/video_streaming_features)
- [Redis Documentation](https://redis.io/documentation)
- [Argon2 Password Hashing](https://argon2-online.com)
- [Sentry Error Tracking](https://sentry.io/documentation)
- [HLS Streaming Protocol](https://developer.apple.com/streaming/)
- [Prisma ORM](https://www.prisma.io/docs/)
