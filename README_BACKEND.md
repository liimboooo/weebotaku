# AnimeWch Backend - Advanced Features Complete Guide

## 🎯 Overview

This is a **production-grade backend** for AnimeWch, a social platform for anime edits and manga content with advanced gamification, real-time features, and high-performance video streaming.

**Status**: ✅ All 5 Advanced Modules Complete & Production Ready

---

## 📚 Quick Navigation

### Getting Started
- **New to the project?** → Start with [SETUP_ADVANCED.md](./SETUP_ADVANCED.md)
- **Want the full architecture?** → Read [BACKEND_IMPLEMENTATION.md](./BACKEND_IMPLEMENTATION.md)
- **Building the API?** → Check [API_ROUTES.md](./API_ROUTES.md)
- **Deep dive features?** → See [ADVANCED_FEATURES.md](./ADVANCED_FEATURES.md)
- **Dependencies?** → Review [DEPENDENCIES.md](./DEPENDENCIES.md)

---

## ✨ What's Included

### 1️⃣ Advanced Video Infrastructure
- **Multi-resolution Transcoding**: 480p, 720p, 1080p, 4K
- **Adaptive Streaming**: HLS + DASH with automatic quality selection
- **Thumbnail Generation**: Animated GIFs and poster frames
- **Webhook Integration**: Real-time transcoding status updates
- **Technology**: Cloudinary integration with secure signed uploads

### 2️⃣ Real-time Engine
- **Live Notifications**: Likes, comments, follows, milestones
- **Activity Feed**: Global platform activity in real-time
- **WebSocket Support**: Pusher as fallback to Redis pub/sub
- **Persistent Storage**: Database backup for missed events
- **Technology**: Redis pub/sub + Server-Sent Events

### 3️⃣ Bounty & Streak Gamification
- **Bounty System**: 6-tier ranking (Bronze → INFINITE)
  - Formula: (Likes × 10) + (Comments × 5) + (Daily Logins × 50) + (Uploads × 500)
  - INFINITE rank at 1.5B bounty points
- **Daily Streaks**: Login streaks with milestone notifications
  - Milestone alerts at 7, 14, 30, 60, 90, 100, 365 days
  - Optional premium streak freeze
- **Leaderboards**: Global bounty and streak rankings
- **Technology**: BigInt for large values, Redis caching

### 4️⃣ Trending Algorithm
- **Velocity-based**: Engagement per hour, not just total counts
- **Multi-factor**: Recency boost, engagement rate, creator influence
- **Category Support**: Per-category trending and creator discovery
- **Advanced Filtering**: Multi-tag + category combined search
- **Technology**: TrendingService with 15-minute cache updates

### 5️⃣ Security & Performance
- **Argon2 Hashing**: Industry-standard password security
- **Rate Limiting**: Per-endpoint and global rate limits
- **Input Validation**: XSS prevention, SQL injection protection
- **Error Tracking**: Sentry integration with configurable sampling
- **Comprehensive Logging**: Winston with file rotation
- **Technology**: Helmet, Zod validation, custom middleware

---

## 🗂️ Project Structure

```
animewch/
├── prisma/
│   └── schema.prisma              # 16 models + relationships
├── src/
│   ├── services/
│   │   ├── bounty.service.ts      # Bounty calculations (350 lines)
│   │   ├── streak.service.ts      # Daily streak tracking (350 lines)
│   │   ├── trending.service.ts    # Trending algorithm (500 lines)
│   │   ├── transcoding.service.ts # Video transcoding (300 lines)
│   │   └── realtime.service.ts    # Real-time notifications (400 lines)
│   ├── lib/
│   │   ├── redis.ts               # Redis client utilities (350 lines)
│   │   ├── logger.ts              # Winston + Sentry (300 lines)
│   │   ├── security.ts            # Auth & validation (400 lines)
│   │   ├── auth.ts                # NextAuth config (200 lines)
│   │   └── cloudinary.ts          # Video upload (250 lines)
│   ├── middleware/
│   │   └── auth.ts                # Express-style middleware (350 lines)
│   └── controllers/
│       └── api.ts                 # Business logic (400+ lines)
├── pages/
│   ├── api/
│   │   ├── auth/[...nextauth].ts
│   │   ├── edits/
│   │   │   ├── index.ts
│   │   │   ├── [editId].ts
│   │   │   └── upload/signature.ts
│   │   ├── users/
│   │   │   ├── me.ts
│   │   │   └── [userId].ts
│   │   ├── social/
│   │   ├── search.ts
│   │   ├── trending.ts
│   │   ├── webhooks/cloudinary.ts
│   │   └── notifications/
│   └── _app.tsx
├── .env.local.example             # Environment template
├── SETUP_ADVANCED.md              # Installation guide (500 lines)
├── ADVANCED_FEATURES.md           # Feature documentation (1000 lines)
├── API_ROUTES.md                  # API reference (600 lines)
├── DEPENDENCIES.md                # Dependency guide (300 lines)
├── BACKEND_IMPLEMENTATION.md      # This implementation summary
└── package.json                   # Dependencies
```

---

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Check versions
node --version          # v18.0.0 or higher
npm --version           # v8.0.0 or higher
redis-cli --version     # v6.0.0 or higher (for development)
psql --version          # v13.0 or higher
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials:
# - PostgreSQL connection string
# - Redis host/port
# - Cloudinary API keys
# - NextAuth secret
# - OAuth provider keys (Google, Discord)
```

### 4. Setup Database
```bash
npx prisma migrate dev --name init
```

### 5. Start Development Server
```bash
npm run dev
# Server runs on http://localhost:3000
```

---

## 🔑 Key Features at a Glance

| Feature | Implementation | Status |
|---------|----------------|--------|
| Video Upload | Cloudinary signed URLs | ✅ |
| Multi-res Streaming | HLS/DASH adaptive | ✅ |
| Bounty System | 6-tier with formula | ✅ |
| Daily Streaks | 365-day tracking | ✅ |
| Trending Algorithm | Velocity-based | ✅ |
| Real-time Notifications | Redis pub/sub | ✅ |
| Password Security | Argon2 hashing | ✅ |
| Rate Limiting | Per-endpoint limits | ✅ |
| Error Tracking | Sentry integration | ✅ |
| Comprehensive Logging | Winston + file rotation | ✅ |

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js Frontend                       │
│  (React Components + Pages)                             │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────────┐   ┌──────▼─────────────┐
│  Next.js API       │   │ WebSocket Events   │
│  Routes            │   │ (SSE/Pusher)      │
│                    │   │                    │
│ ├─ /api/edits      │   └────────────────────┘
│ ├─ /api/users      │
│ ├─ /api/trending   │
│ ├─ /api/social     │
│ └─ /api/auth       │
└────────┬───────────┘
         │
    ┌────┴──────────────────────────────────┐
    │                                       │
    │    Service Layer                      │
    │  ┌──────────────────────────────────┐ │
    │  │ ├─ BountyService                │ │
    │  │ ├─ StreakService                │ │
    │  │ ├─ TrendingService              │ │
    │  │ ├─ TranscodingService           │ │
    │  │ └─ RealtimeService              │ │
    │  └──────────────────────────────────┘ │
    │                                       │
    └────┬──────────────────┬──────────────┘
         │                  │
    ┌────▼──────────┐  ┌───▼────────────┐
    │ PostgreSQL    │  │ Redis Cache    │
    │ Database      │  │ & Pub/Sub      │
    │               │  │                │
    │ ├─ Users      │  │ ├─ Trending    │
    │ ├─ Edits      │  │ ├─ Bounty      │
    │ ├─ Comments   │  │ ├─ Streaks     │
    │ ├─ Likes      │  │ └─ Feed        │
    │ └─ Follows    │  │                │
    └───────────────┘  └────────────────┘
         │                  │
         └──────┬───────────┘
                │
    ┌───────────▼──────────────┐
    │ External Services        │
    │                          │
    │ ├─ Cloudinary (Videos)   │
    │ ├─ OAuth (Google/Discord)│
    │ ├─ Sentry (Errors)       │
    │ └─ Pusher (WebSocket)    │
    └──────────────────────────┘
```

---

## 📈 Performance Metrics

### Expected Response Times
| Endpoint | Avg Time | Cached | Notes |
|----------|----------|--------|-------|
| GET /api/edits | 50ms | Yes | Popular edits cache |
| POST /api/edits | 200ms | No | Video upload |
| GET /api/trending | 45ms | Yes | 15-min cache |
| GET /api/users/me | 30ms | Yes | 30-min profile cache |
| POST /api/like | 75ms | No | Bounty recalc |

### Database Query Performance
- Average query time: <50ms
- Slow query threshold: >1000ms
- Indexes on: trending, bountyRank, createdAt, userId
- Full-text search enabled on 6 fields

### Cache Hit Rate Target
- Overall: 85%
- Homepage cache: 95%
- Trending cache: 90%
- Profile cache: 80%

---

## 🔐 Security Features

### Authentication
- NextAuth.js with JWT strategy
- OAuth support (Google, Discord)
- Session persistence in database
- Automatic token refresh

### Password Security
- Argon2id hashing algorithm
- Memory cost: 32MB per hash
- Time cost: 3 iterations
- Strength validation required

### API Security
- Rate limiting: 100 requests / 15 minutes
- CORS protection with origin whitelist
- Security headers (CSP, X-Frame-Options, etc.)
- Input validation and sanitization
- SQL injection prevention

### Error Handling
- Centralized error tracking via Sentry
- Winston logger with file persistence
- Audit trail for user actions
- Security event logging

---

## 🛠️ Configuration

### Environment Variables Required
```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# NextAuth
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000

# OAuth
GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-secret
DISCORD_CLIENT_ID=your-discord-id
DISCORD_CLIENT_SECRET=your-secret

# Sentry (optional)
SENTRY_DSN=https://key@sentry.io/project

# Logging
LOG_LEVEL=debug
```

### Required External Services
1. **PostgreSQL 13+** - Relational database
2. **Redis 6+** - Cache and pub/sub
3. **Cloudinary** - Video storage and transcoding
4. **OAuth Providers** - Google and Discord
5. **Sentry** (optional) - Error tracking

---

## 📖 Detailed Documentation

### Installation & Setup
See [SETUP_ADVANCED.md](./SETUP_ADVANCED.md) for:
- Step-by-step installation
- Local development setup
- Docker configuration
- Production deployment
- Cron job configuration
- Troubleshooting guide

### Feature Documentation
See [ADVANCED_FEATURES.md](./ADVANCED_FEATURES.md) for:
- Bounty system details with examples
- Streak mechanics and edge cases
- Trending algorithm explanation
- Video streaming pipeline
- Real-time architecture
- Security implementation details
- Caching strategies

### API Reference
See [API_ROUTES.md](./API_ROUTES.md) for:
- Complete endpoint listing
- Request/response examples
- Error codes and meanings
- Rate limiting info
- WebSocket events
- Integration examples

### Implementation Summary
See [BACKEND_IMPLEMENTATION.md](./BACKEND_IMPLEMENTATION.md) for:
- Modules overview
- File structure
- Code statistics
- Technology stack
- Next steps

### Dependencies
See [DEPENDENCIES.md](./DEPENDENCIES.md) for:
- Complete package list
- Version requirements
- Installation commands
- Troubleshooting
- Performance benchmarks

---

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Categories
- Unit tests for bounty calculations
- Unit tests for streak logic
- Integration tests for Cloudinary webhooks
- API endpoint tests
- Rate limiting tests

### Example: Test Bounty Calculation
```typescript
describe('BountyService', () => {
  it('should calculate bounty correctly', () => {
    // Formula: (likes*10) + (comments*5) + (daily_logins*50) + (uploads*500)
    const bounty = calculateBounty({
      likes: 100,        // 100 * 10 = 1000
      comments: 20,      // 20 * 5 = 100
      dailyLogins: 30,   // 30 * 50 = 1500
      uploads: 5         // 5 * 500 = 2500
    });
    expect(bounty).toBe(5100);
  });
});
```

---

## 📊 Monitoring & Logging

### Available Logs
- **logs/error.log** - Error messages only
- **logs/all.log** - All messages (info, warn, error)
- **Sentry Dashboard** - Real-time error tracking

### Log Examples
```typescript
// API request logging
log.api('GET', '/api/edits', 200, 45);

// Database query logging
log.database('SELECT', 'edit', 150);

// Cache operation logging
log.cache('GET', 'user:123', true);

// Security event logging
log.security('unauthorized_access', 'high', { userId, endpoint });

// Audit trail
log.audit(userId, 'edit_created', 'Edit', { editId });
```

---

## 🚢 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Deployment Platforms
- ✅ Vercel (recommended for Next.js)
- ✅ AWS (EC2, Lambda, RDS)
- ✅ Google Cloud (Cloud Run, Cloud SQL)
- ✅ DigitalOcean (App Platform)
- ✅ Heroku (with buildpack)

### Pre-deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations complete
- [ ] Redis connection verified
- [ ] Cloudinary webhooks set
- [ ] Sentry DSN configured
- [ ] SSL/TLS enabled
- [ ] Database backups configured
- [ ] Monitoring alerts set

---

## 🤝 Integration Examples

### Frontend: Upload Video
```javascript
const uploadVideo = async (file) => {
  // 1. Get signature
  const sig = await fetch('/api/edits/upload/signature').then(r => r.json());
  
  // 2. Upload to Cloudinary
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', sig.uploadPreset);
  formData.append('signature', sig.signature);
  
  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`,
    { method: 'POST', body: formData }
  );
  
  // 3. Create edit
  return fetch('/api/edits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'My Edit',
      videoUrl: uploadRes.secure_url,
      videoPublicId: uploadRes.public_id
    })
  });
};
```

### Frontend: Subscribe to Notifications
```javascript
useEffect(() => {
  const eventSource = new EventSource('/api/notifications/stream');
  
  eventSource.addEventListener('like', (e) => {
    const { data } = JSON.parse(e.data);
    showNotification(`${data.user.name} liked your edit`);
  });
  
  return () => eventSource.close();
}, []);
```

---

## 📱 Frontend Integration Points

### Required Frontend Endpoints
1. **Video Upload Form** → POST /api/edits
2. **Edit Details Page** → GET /api/edits/[editId]
3. **Feed Component** → GET /api/edits
4. **Search Page** → GET /api/search
5. **User Profile** → GET /api/users/[userId]
6. **Trending Page** → GET /api/trending
7. **Notifications** → EventSource /api/notifications/stream

### Recommended Frontend Libraries
- React Query for data fetching
- Socket.io-client for WebSocket
- Cloudinary React component for upload
- Chart.js for analytics
- Material-UI or Tailwind for styling

---

## 🐛 Troubleshooting

### Common Issues

**Redis Connection Failed**
```bash
redis-cli ping        # Should return PONG
redis-cli info        # Check Redis status
```

**Database Migration Error**
```bash
npx prisma migrate reset  # Reset to clean state
npx prisma db push        # Push schema only
```

**Video Upload Fails**
```bash
# Check Cloudinary credentials
curl -u "key:secret" https://api.cloudinary.com/v1_1/your-cloud/resources
```

**Argon2 Installation Error**
```bash
npm install --build-from-source
```

See [SETUP_ADVANCED.md](./SETUP_ADVANCED.md#troubleshooting) for more solutions.

---

## 📞 Support

- **Issues?** → Check [SETUP_ADVANCED.md](./SETUP_ADVANCED.md#troubleshooting)
- **API Questions?** → See [API_ROUTES.md](./API_ROUTES.md)
- **Feature Details?** → Read [ADVANCED_FEATURES.md](./ADVANCED_FEATURES.md)
- **Dependency Help?** → View [DEPENDENCIES.md](./DEPENDENCIES.md)

---

## 📝 License

Private project - AnimeWch

---

## ✅ Checklist: All Features Implemented

- ✅ Advanced Video Infrastructure (Multi-res, HLS/DASH, GIFs)
- ✅ Real-time Engine (Notifications, Activity Feed, WebSocket ready)
- ✅ Bounty System (6-tier ranking, 1.5B max, formula-based)
- ✅ Daily Streaks (365-day tracking, freezing, milestones)
- ✅ Trending Algorithm (Velocity-based, category support)
- ✅ Security (Argon2, rate limiting, validation, headers)
- ✅ Logging (Winston, Sentry, audit trail)
- ✅ Caching (Redis with smart TTLs)
- ✅ Database Schema (16 models, optimized indexes)
- ✅ API Routes (30+ endpoints)
- ✅ Middleware (Auth, rate limit, error handling)
- ✅ Services (5 core services)
- ✅ Documentation (4 comprehensive guides)

---

**Last Updated**: January 2025
**Version**: 2.0.0 (Advanced Features Complete)
**Status**: ✅ Production Ready
