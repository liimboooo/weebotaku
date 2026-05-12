# API Routes Reference - AnimeWch Advanced Backend

## Authentication Routes

### POST /api/auth/signin
Login user with OAuth or credentials
```json
{
  "provider": "google" | "discord"
}
```

### GET /api/auth/session
Get current user session
```json
{
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "bountyRank": "Gold"
  }
}
```

### POST /api/auth/signout
Sign out current user

---

## User Routes

### GET /api/users/me
Get current authenticated user profile
```json
{
  "id": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "bountyRank": "Gold",
  "totalBounty": 5000000,
  "totalEpisodesWatched": 450,
  "currentStreak": 45,
  "longestStreak": 180,
  "followerCount": 1200,
  "followingCount": 350,
  "totalEditsCreated": 28,
  "totalViews": 125000
}
```

### PUT /api/users/me
Update current user profile
```json
{
  "name": "New Name",
  "bio": "Updated bio",
  "image": "https://cloudinary.com/avatar.jpg"
}
```

### GET /api/users/[userId]
Get public user profile
```json
{
  "id": "user123",
  "name": "John Doe",
  "image": "https://...",
  "bio": "Creator of amazing edits",
  "bountyRank": "Gold",
  "totalEditsCreated": 28,
  "totalViews": 125000,
  "followerCount": 1200
}
```

### GET /api/users/top-creators?limit=20
Get top creators by views/engagement
```json
{
  "creators": [
    {
      "id": "user123",
      "name": "Jane Creator",
      "image": "https://...",
      "bountyRank": "Platinum",
      "totalEditsCreated": 150,
      "totalViews": 5000000,
      "followerCount": 50000
    }
  ]
}
```

### POST /api/users/[userId]/follow
Follow a user
```json
{
  "following": true,
  "message": "Followed successfully"
}
```

### GET /api/users/[userId]/followers?page=1&limit=20
Get user's followers
```json
{
  "followers": [
    {
      "id": "follower123",
      "name": "Follower Name",
      "image": "https://...",
      "bountyRank": "Silver",
      "totalEditsCreated": 10
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1200,
    "pages": 60,
    "hasMore": true
  }
}
```

### GET /api/users/[userId]/following?page=1&limit=20
Get users this user is following

---

## Video/Edit Routes

### POST /api/edits/upload/signature
Get Cloudinary upload signature (authenticated)
```json
{
  "timestamp": 1234567890,
  "signature": "abc123xyz...",
  "uploadPreset": "animewch_edits",
  "cloudName": "your-cloud-name"
}
```

### GET /api/edits?page=1&limit=20&sortBy=latest&categoryId=cat123&tags=action,anime
Get edits feed with filtering
```json
{
  "edits": [
    {
      "id": "edit123",
      "title": "Amazing Anime Edit",
      "description": "Description here",
      "videoUrl": "https://...",
      "thumbnailUrl": "https://...",
      "animatedGif": "https://...",
      "duration": 180,
      "viewCount": 5000,
      "likeCount": 120,
      "commentCount": 45,
      "trendingScore": 8450,
      "creator": {
        "id": "user123",
        "name": "Creator Name",
        "image": "https://...",
        "bountyRank": "Gold"
      },
      "categories": [
        { "id": "cat123", "name": "Action" }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5000,
    "pages": 250,
    "hasMore": true
  }
}
```

### POST /api/edits
Create new edit (authenticated)
```json
{
  "title": "New Edit Title",
  "description": "Edit description",
  "videoUrl": "https://cloudinary.com/v1_1/.../video.mp4",
  "videoPublicId": "public_id_from_upload",
  "duration": 180,
  "tags": ["anime", "action", "edit"],
  "categoryIds": ["cat123", "cat456"]
}
```

Response:
```json
{
  "id": "edit123",
  "title": "New Edit Title",
  "creator": {
    "id": "user123",
    "name": "Your Name"
  },
  "processingStatus": "pending",
  "createdAt": "2026-05-11T10:30:00Z",
  "message": "Edit created successfully"
}
```

### GET /api/edits/[editId]
Get single edit details with metrics
```json
{
  "id": "edit123",
  "title": "Amazing Edit",
  "description": "Full description",
  "videoUrl": "https://...",
  "hlsManifestUrl": "https://.../video.m3u8",
  "dashManifestUrl": "https://.../video.mpd",
  "duration": 180,
  "processingStatus": "completed",
  "viewCount": 5000,
  "likeCount": 120,
  "commentCount": 45,
  "creator": {
    "id": "user123",
    "name": "Creator",
    "image": "https://...",
    "bountyRank": "Gold"
  },
  "categories": [...],
  "likes": [{ "userId": "..." }, ...],
  "comments": [
    {
      "id": "comment123",
      "content": "Great edit!",
      "user": {
        "id": "user456",
        "name": "Commenter",
        "image": "https://..."
      }
    }
  ]
}
```

### PUT /api/edits/[editId]
Update edit (creator only)
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "tags": ["anime", "action"],
  "categoryIds": ["cat123"]
}
```

### DELETE /api/edits/[editId]
Delete edit (creator only)
```json
{
  "success": true,
  "message": "Edit deleted successfully"
}
```

### GET /api/edits/[editId]/transcoding
Get video transcoding status
```json
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

## Social/Interaction Routes

### POST /api/edits/[editId]/like
Like an edit (authenticated)
```json
{
  "liked": true,
  "message": "Like added"
}
```

### GET /api/edits/[editId]/comments?page=1&limit=10
Get comments on an edit
```json
{
  "comments": [
    {
      "id": "comment123",
      "content": "Great work!",
      "user": {
        "id": "user456",
        "name": "Commenter",
        "image": "https://..."
      },
      "replies": [
        {
          "id": "reply123",
          "content": "Thanks!",
          "user": {
            "id": "user123",
            "name": "Creator"
          }
        }
      ]
    }
  ],
  "pagination": { ... }
}
```

### POST /api/edits/[editId]/comments
Add comment (authenticated)
```json
{
  "content": "Amazing edit!",
  "parentId": null  // or comment ID for replies
}
```

### POST /api/edits/[editId]/watchlist
Add/update edit in watchlist (authenticated)
```json
{
  "status": "watching",  // watching, completed, planned, dropped
  "progress": 0          // percentage watched
}
```

### GET /api/watchlist?status=all&page=1&limit=20
Get user's watchlist (authenticated)
```json
{
  "watchlist": [
    {
      "id": "watchlist123",
      "edit": { ... },
      "status": "watching",
      "progress": 50,
      "addedAt": "2026-05-10T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

## Search & Discovery Routes

### GET /api/search?query=anime&page=1&limit=20
Full-text search across edits
```json
{
  "results": [
    {
      "id": "edit123",
      "title": "Anime Edit Results",
      "description": "...",
      "creator": { ... },
      "viewCount": 1000,
      "likeCount": 50
    }
  ],
  "pagination": { ... }
}
```

### GET /api/edits/category/[categorySlug]?page=1&limit=20&sortBy=latest
Get edits by category
```json
{
  "category": {
    "id": "cat123",
    "name": "Action",
    "slug": "action",
    "description": "Action-packed edits"
  },
  "edits": [ ... ],
  "pagination": { ... }
}
```

### GET /api/trending?limit=50&timeframe=24h
Get trending edits
```json
{
  "edits": [
    {
      "editId": "edit123",
      "title": "Trending Edit",
      "creator": "Creator Name",
      "velocity": 45,  // engagement per hour
      "totalEngagement": 250,
      "viewCount": 5000,
      "trendingScore": 8450,
      "rank": 1
    }
  ]
}
```

### GET /api/trending/category/[categorySlug]?limit=30&timeframe=24h
Get trending edits in category

### GET /api/trending/creators?limit=20&timeframe=24h
Get trending creators
```json
{
  "creators": [
    {
      "id": "user123",
      "name": "Top Creator",
      "image": "https://...",
      "bountyRank": "Platinum",
      "editsCount": 150,
      "totalLikes": 50000,
      "totalComments": 30000,
      "totalViews": 5000000,
      "engagementScore": 1250000
    }
  ]
}
```

### GET /api/edits/filtered?tags=Action,Seinen&categories=Anime&sortBy=trending
Advanced multi-tag and category filtering
```json
{
  "edits": [ ... ],
  "filters": {
    "tags": ["Action", "Seinen"],
    "categories": ["Anime"],
    "sortBy": "trending"
  }
}
```

---

## Notifications Routes

### GET /api/notifications/unread
Get unread notifications (authenticated)
```json
{
  "notifications": [
    {
      "id": "notif123",
      "type": "like",
      "title": "New Like",
      "message": "Jane liked your edit",
      "relatedUserId": "user456",
      "relatedEditId": "edit123",
      "actionUrl": "/edit/edit123",
      "isRead": false,
      "createdAt": "2026-05-11T10:00:00Z"
    }
  ]
}
```

### PUT /api/notifications/read
Mark notifications as read (authenticated)
```json
{
  "notificationIds": ["notif123", "notif124"]
}
```

### GET /api/notifications/feed?limit=50&offset=0
Get global activity feed
```json
{
  "feed": [
    {
      "id": "activity123",
      "userId": "user123",
      "action": "new_upload",
      "editId": "edit123",
      "editTitle": "New Edit",
      "creatorName": "Creator Name",
      "createdAt": "2026-05-11T10:00:00Z"
    }
  ]
}
```

---

## Stats & Analytics Routes

### GET /api/users/me/stats
Get current user statistics (authenticated)
```json
{
  "totalEditsCreated": 28,
  "totalViews": 125000,
  "totalLikes": 3000,
  "totalComments": 1500,
  "bountyRank": "Gold",
  "totalBounty": 5000000,
  "currentStreak": 45,
  "longestStreak": 180,
  "followerCount": 1200,
  "followingCount": 350,
  "averageViewsPerEdit": 4464,
  "engagementRate": 3.6
}
```

### GET /api/edits/[editId]/stats
Get edit analytics
```json
{
  "editId": "edit123",
  "title": "Edit Title",
  "views": 5000,
  "likes": 120,
  "comments": 45,
  "likeRatio": 2.4,
  "engagementRate": 3.3,
  "createdAt": "2026-05-10T10:00:00Z"
}
```

### GET /api/bounty/leaderboard?limit=50
Get bounty rank leaderboard
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user": {
        "id": "user123",
        "name": "Top Player",
        "image": "https://..."
      },
      "bountyRank": "INFINITE",
      "totalBounty": 2000000000,
      "totalEditsCreated": 500,
      "followerCount": 100000
    }
  ]
}
```

### GET /api/streaks/leaderboard?limit=50
Get daily streak leaderboard
```json
{
  "leaderboard": [
    {
      "id": "user123",
      "name": "Streak King",
      "image": "https://...",
      "dailyLoginStreak": 365,
      "longestStreak": 365,
      "bountyRank": "Gold"
    }
  ]
}
```

---

## Webhook Routes

### POST /api/webhooks/cloudinary
Cloudinary webhook for video transcoding
```json
{
  "public_id": "video_public_id",
  "event": "processing_complete",
  "secure_url": "https://...",
  "duration": 180,
  "eager": [
    {
      "transformation": "h_720",
      "secure_url": "https://..."
    }
  ]
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (already exists) |
| 429 | Too Many Requests (Rate Limited) |
| 500 | Internal Server Error |

### Common Error Codes

| Code | Meaning |
|------|---------|
| UNAUTHORIZED | User not authenticated |
| FORBIDDEN | User not authorized |
| NOT_FOUND | Resource not found |
| ALREADY_EXISTS | Resource already exists |
| VALIDATION_ERROR | Request validation failed |
| RATE_LIMITED | Too many requests |
| INTERNAL_ERROR | Server error |

---

## Rate Limiting

**Standard endpoints**: 100 requests per 15 minutes
**Auth endpoints**: 5 requests per 15 minutes
**Search endpoints**: 30 requests per 1 minute

Rate limit headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
Retry-After: 300
```

---

## Authentication

All authenticated endpoints require:
```
Authorization: Bearer {sessionToken}
```

Or cookie:
```
Cookie: next-auth.session-token=xxx
```

---

## Examples

### Upload Video & Create Edit

```bash
# 1. Get upload signature
curl -X POST http://localhost:3000/api/edits/upload/signature \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json"

# 2. Upload to Cloudinary (client-side with FormData)

# 3. Create edit
curl -X POST http://localhost:3000/api/edits \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Edit",
    "videoUrl": "https://...",
    "videoPublicId": "public_id",
    "duration": 180,
    "tags": ["anime"],
    "categoryIds": ["cat123"]
  }'
```

### Like & Comment

```bash
# Like an edit
curl -X POST http://localhost:3000/api/edits/edit123/like \
  -H "Authorization: Bearer token"

# Comment on edit
curl -X POST http://localhost:3000/api/edits/edit123/comments \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Great edit!"
  }'
```

### Search & Filter

```bash
# Search
curl "http://localhost:3000/api/search?query=anime&limit=20"

# Filter by tags and category
curl "http://localhost:3000/api/edits/filtered?tags=Action,Seinen&categories=Anime&limit=20"

# Get trending
curl "http://localhost:3000/api/trending?limit=50&timeframe=24h"
```

---

## WebSocket Events (Real-time)

Connect to `/api/notifications/stream`:

### Incoming Events
- `like` - Someone liked your edit
- `comment` - Someone commented on your edit
- `follow` - Someone started following you
- `milestone` - You reached a new rank/streak
- `global_activity` - New uploads/trending

### Example

```javascript
const eventSource = new EventSource('/api/notifications/stream');

eventSource.addEventListener('like', (e) => {
  const data = JSON.parse(e.data);
  console.log(`${data.liker.name} liked your edit`);
});

eventSource.addEventListener('follow', (e) => {
  const data = JSON.parse(e.data);
  console.log(`${data.follower.name} started following you`);
});
```
