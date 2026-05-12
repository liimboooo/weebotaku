# Quick Reference Guide

## API Base URL
```
http://localhost:5000/api
```

## Authentication Headers
All requests (except login/register) require:
```
Authorization: Bearer {token}
Content-Type: application/json
```

## Quick Service Usage

### Auth
```javascript
import authService from './services/authService';

// Register
authService.register(username, email, password, passwordConfirm);

// Login
authService.login(email, password);

// Get current user
authService.getMe();

// Update profile
authService.updateProfile(username, bio, avatar);

// Logout
authService.logout();

// Check if logged in
authService.isLoggedIn();
```

### Anime
```javascript
import animeService from './services/animeService';

// Get all anime
animeService.getAll({ page: 1, limit: 20, genre: 'Action' });

// Get by ID
animeService.getById(1);

// Get trending
animeService.getTrending();

// Get popular
animeService.getPopular();

// Search
animeService.searchAnime('Naruto', { page: 1 });

// Watchlist
animeService.addToWatchlist(animeId);
animeService.removeFromWatchlist(animeId);
animeService.getWatchlist();

// History
animeService.updateWatchHistory(animeId, episodeNumber);
```

### Manga
```javascript
import mangaService from './services/mangaService';

// Get all manga
mangaService.getAll({ page: 1, limit: 20 });

// Get by ID
mangaService.getById(1);

// Get popular
mangaService.getPopular();

// List management
mangaService.addToList(mangaId);
mangaService.removeFromList(mangaId);

// Search
mangaService.searchManga('OnePiece');
```

### Reviews
```javascript
import reviewService from './services/reviewService';

// Create review
reviewService.createReview(animeId, mangaId, rating, title, content, isSpoiler);

// Get reviews
reviewService.getReviews('anime', animeId, page, limit);
reviewService.getReviews('manga', mangaId, page, limit);

// Like review
reviewService.likeReview(reviewId);

// Delete review
reviewService.deleteReview(reviewId);
```

### Community
```javascript
import communityService from './services/communityService';

// Get all posts
communityService.getAllPosts({ page: 1, category: 'discussion' });

// Create post
communityService.createPost(title, content, category, tags, images);

// Get single post
communityService.getPostById(postId);

// Like post
communityService.likePost(postId);

// Add comment
communityService.addComment(postId, content);

// Delete post
communityService.deletePost(postId);
```

### News
```javascript
import newsService from './services/newsService';

// Get all news
newsService.getAll({ page: 1, limit: 20 });

// Get featured
newsService.getFeatured();

// Get by category
newsService.getByCategory('anime', page, limit);

// Get by ID
newsService.getById(articleId);

// Like news
newsService.likeNews(articleId);

// Create news (Admin)
newsService.createNews(title, description, content, imageUrl, category, featured);
```

## Custom Hooks Usage

```javascript
import { useAPI, useMutation, usePaginated } from './hooks/useAPI';

// Simple fetch
const { data, loading, error, refetch } = useAPI(apiFunction, params);

// Mutation (POST/PUT/DELETE)
const { mutate, loading, error } = useMutation(apiFunction);

// Paginated data
const { data, page, loading, hasMore, loadMore, reset } = usePaginated(apiFunction, limit);
```

## Common Response Format

```javascript
{
  success: true,
  data: { /* your data */ },
  count: 20,              // Items in response
  total: 150,             // Total items available
  page: 1,                // Current page
  pages: 8                // Total pages
}
```

## Error Handling

```javascript
try {
  const result = await animeService.getAll();
  // Use result.data
} catch (error) {
  // error.message contains the error text
  console.error(error.message);
}
```

## Component Integration Template

```javascript
import { useState, useEffect } from 'react';
import { usePaginated } from '../hooks/useAPI';
import animeService from '../services/animeService';

export default function MyComponent() {
  const { data: items, loading, error, hasMore, loadMore } = usePaginated(
    (params) => animeService.getAll(params),
    20
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {items.map(item => (
        <div key={item._id}>{item.title}</div>
      ))}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

## Query Parameters Reference

### Pagination
```
?page=1&limit=20
```

### Filtering
```
?genre=Action&year=2024&status=Airing&sort=-rating
```

### Examples
```
GET /anime?page=1&limit=20&genre=Action&year=2024
GET /reviews/anime/1?page=1&limit=10
GET /news/category/anime?page=1&limit=20
GET /community?page=1&category=discussion
```

## Database Field Reference

### Anime
```javascript
{
  _id: ObjectId,
  animeId: Number,        // Jikan ID
  title: String,
  englishTitle: String,
  description: String,
  imageUrl: String,
  coverUrl: String,
  year: Number,
  season: String,
  episodes: Number,
  status: String,         // Airing, Finished
  rating: Number,         // 0-10
  genres: [String],       // ['Action', 'Adventure']
  studios: [String],
  source: String,         // Manga, Original, etc
  type: String,           // TV, Movie, OVA
  averageRating: Number,
  totalReviews: Number,
  isPopular: Boolean,
  isTrending: Boolean,
  reviews: [ObjectId],    // Review IDs
  createdAt: Date,
  updatedAt: Date
}
```

### User
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  avatar: String,
  bio: String,
  isPremium: Boolean,
  role: String,           // 'user', 'moderator', 'admin'
  watchlist: [{ animeId: Number, addedAt: Date }],
  history: [{ animeId: Number, episodeWatched: Number, lastWatchedAt: Date }],
  follows: [ObjectId],    // User IDs
  followers: [ObjectId],
  isVerified: Boolean,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Review
```javascript
{
  _id: ObjectId,
  author: ObjectId,       // User ID
  animeId: Number,        // Optional
  mangaId: Number,        // Optional
  rating: Number,         // 1-10
  title: String,
  content: String,
  likes: Number,
  likedBy: [ObjectId],    // User IDs
  isSpoiler: Boolean,
  isApproved: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### CommunityPost
```javascript
{
  _id: ObjectId,
  author: ObjectId,       // User ID
  title: String,
  content: String,
  category: String,       // 'discussion', 'artwork', etc
  tags: [String],
  images: [String],
  likes: Number,
  likedBy: [ObjectId],
  comments: [
    {
      author: ObjectId,   // User ID
      content: String,
      createdAt: Date,
      likes: Number
    }
  ],
  viewCount: Number,
  isApproved: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/animewch
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Testing API Endpoints

### Using curl
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"user@example.com","password":"pass123","passwordConfirm":"pass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Get anime
curl http://localhost:5000/api/anime

# Get anime with auth
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman
1. Set base URL: `http://localhost:5000/api`
2. Add token in Authorization header
3. Send requests to endpoints

## Common Issues & Solutions

### "Cannot GET /api/anime"
- Backend not running on port 5000
- Route not registered in server.js

### "401 Unauthorized"
- Token missing or invalid
- Check Authorization header
- Token may have expired

### "CORS blocked"
- Check CORS_ORIGIN in backend .env
- Verify frontend URL matches

### "Cannot connect to MongoDB"
- MongoDB service not running
- Connection URI incorrect
- Network access not allowed

## Performance Tips

1. Use pagination for large datasets
2. Debounce search inputs
3. Cache frequently accessed data
4. Use React.memo for list items
5. Lazy load images
6. Use useCallback to prevent re-renders

## Security Notes

1. Never store sensitive data in localStorage (besides JWT)
2. Always use HTTPS in production
3. Validate input client and server-side
4. Use secure JWT secrets
5. Implement CORS properly
6. Rate limit API endpoints
7. Hash passwords (done by bcryptjs)

## Documentation Links

- Full Integration Guide: [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- Component Examples: [COMPONENT_EXAMPLES.md](COMPONENT_EXAMPLES.md)
- Backend README: [backend/README.md](backend/README.md)
- Integration Summary: [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)

---

**Last Updated:** May 2026
**Backend Version:** 1.0.0
**Frontend:** React with Modern Hooks
