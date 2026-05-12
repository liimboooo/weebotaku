# Frontend-Backend Integration Guide

This guide explains how to integrate the React frontend with the Node.js + Express backend.

## Setup

### 1. Environment Configuration

Create a `.env` file in the frontend directory with:

```
REACT_APP_API_URL=http://localhost:5000/api
```

For production:
```
REACT_APP_API_URL=https://your-backend-domain.com/api
```

### 2. Start Backend Server

```bash
cd backend
npm install
npm run dev
```

Backend will run on `http://localhost:5000`

### 3. Start Frontend Application

```bash
cd frontend
npm start
```

Frontend will run on `http://localhost:3000`

## Available API Services

### Authentication Service (`authService.js`)

```javascript
import authService from './services/authService';

// Register new user
const result = await authService.register(username, email, password, passwordConfirm);

// Login
const result = await authService.login(email, password);

// Get current user profile
const user = await authService.getMe();

// Update profile
const updated = await authService.updateProfile(username, bio, avatar);

// Logout
await authService.logout();

// Check if logged in
const isLogged = authService.isLoggedIn();

// Get current user from localStorage
const user = authService.getCurrentUser();
```

### Anime Service (`animeService.js`)

```javascript
import animeService from './services/animeService';

// Get all anime with filters
const result = await animeService.getAll({ 
  page: 1, 
  limit: 20,
  genre: 'Action',
  year: 2024,
  status: 'Airing'
});

// Get anime by ID
const anime = await animeService.getById(1);

// Get trending anime
const trending = await animeService.getTrending();

// Get popular anime
const popular = await animeService.getPopular();

// Search anime
const results = await animeService.searchAnime('Naruto', { page: 1 });

// Watchlist Management
await animeService.addToWatchlist(animeId);
await animeService.removeFromWatchlist(animeId);
const watchlist = await animeService.getWatchlist();

// Update watch history
await animeService.updateWatchHistory(animeId, episodeNumber);
```

### Manga Service (`mangaService.js`)

```javascript
import mangaService from './services/mangaService';

// Get all manga
const result = await mangaService.getAll({ page: 1, limit: 20 });

// Get manga by ID
const manga = await mangaService.getById(1);

// Get popular manga
const popular = await mangaService.getPopular();

// List management
await mangaService.addToList(mangaId);
await mangaService.removeFromList(mangaId);

// Search
const results = await mangaService.searchManga('OnePiece');
```

### Reviews Service (`reviewService.js`)

```javascript
import reviewService from './services/reviewService';

// Create review
const review = await reviewService.createReview(
  animeId,    // or null
  mangaId,    // or null
  rating,     // 1-10
  title,
  content,
  isSpoiler   // boolean
);

// Get reviews
const reviews = await reviewService.getReviews('anime', animeId, page, limit);
// or
const reviews = await reviewService.getReviews('manga', mangaId, page, limit);

// Like review
await reviewService.likeReview(reviewId);

// Delete review
await reviewService.deleteReview(reviewId);
```

### Community Service (`communityService.js`)

```javascript
import communityService from './services/communityService';

// Get all posts
const posts = await communityService.getAllPosts({ 
  page: 1,
  category: 'discussion'
});

// Create post
const post = await communityService.createPost(
  title,
  content,
  category, // 'discussion', 'artwork', 'meme', 'fan-fiction', 'news', 'other'
  tags,
  images
);

// Get single post
const post = await communityService.getPostById(postId);

// Like post
await communityService.likePost(postId);

// Add comment
const comment = await communityService.addComment(postId, commentContent);

// Delete post
await communityService.deletePost(postId);
```

### News Service (`newsService.js`)

```javascript
import newsService from './services/newsService';

// Get all news
const news = await newsService.getAll({ page: 1, limit: 20 });

// Get featured news
const featured = await newsService.getFeatured();

// Get news by category
const categoryNews = await newsService.getByCategory('anime', page, limit);

// Get single article
const article = await newsService.getById(articleId);

// Like article
await newsService.likeNews(articleId);

// Create news (Admin only)
const news = await newsService.createNews(
  title,
  description,
  content,
  imageUrl,
  category,
  featured
);
```

## Component Integration Examples

### Using Authentication in AuthPage

```javascript
import authService from '../services/authService';

function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await authService.login(email, password);
      if (result.success) {
        navigate('/home');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {/* form fields */}
    </form>
  );
}
```

### Using Anime Service in Browse

```javascript
import animeService from '../services/animeService';

function Browse() {
  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnime = async () => {
      try {
        const result = await animeService.getAll({ 
          page: 1, 
          limit: 20,
          genre: 'Action'
        });
        setAnime(result.data);
      } catch (err) {
        console.error('Failed to load anime:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnime();
  }, []);

  return (
    <div>
      {loading ? (
        <Loader />
      ) : (
        <div className="grid">
          {anime.map(item => (
            <AnimeCard key={item._id} anime={item} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Using Watchlist

```javascript
import animeService from '../services/animeService';

function AnimeCard({ anime }) {
  const [inWatchlist, setInWatchlist] = useState(false);

  const toggleWatchlist = async () => {
    try {
      if (inWatchlist) {
        await animeService.removeFromWatchlist(anime.animeId);
      } else {
        await animeService.addToWatchlist(anime.animeId);
      }
      setInWatchlist(!inWatchlist);
    } catch (err) {
      console.error('Failed to update watchlist:', err);
    }
  };

  return (
    <div className="card">
      {/* card content */}
      <button onClick={toggleWatchlist} className={inWatchlist ? 'active' : ''}>
        {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
      </button>
    </div>
  );
}
```

### Using Community Posts

```javascript
import communityService from '../services/communityService';

function CommunityFeed() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const result = await communityService.getAllPosts({ 
        page: 1,
        category: 'discussion'
      });
      setPosts(result.data);
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  };

  const handleCreatePost = async (title, content) => {
    try {
      const newPost = await communityService.createPost(
        title,
        content,
        'discussion'
      );
      setPosts([newPost, ...posts]);
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  return (
    <div>
      <PostForm onSubmit={handleCreatePost} />
      <PostList posts={posts} />
    </div>
  );
}
```

## Authentication Flow

1. **Login**: User enters credentials → `authService.login()` → Token stored in localStorage
2. **API Calls**: Each request includes token in Authorization header: `Bearer {token}`
3. **Token Validation**: Backend validates token on protected routes
4. **Logout**: Clear token from localStorage → Redirect to auth page

## Error Handling

The API client automatically handles common errors:

- **401 Unauthorized**: Token invalid/expired → Redirect to login
- **Network Errors**: Caught and logged with proper error messages
- **Validation Errors**: Server returns error messages in response

```javascript
try {
  await animeService.getAll();
} catch (error) {
  console.error(error.message); // Display to user
}
```

## Data Mapping

The frontend should map backend response data to component props:

**Backend Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "animeId": 1,
    "title": "Naruto",
    "rating": 8.5
  }
}
```

**Frontend Usage:**
```javascript
const { data } = await animeService.getById(1);
// Access: data.title, data.rating, data.animeId
```

## Next Steps

1. Replace existing API calls in components with the new services
2. Update state management to use backend data
3. Add error boundaries for better error handling
4. Implement caching strategies for better performance
5. Add request debouncing for search/filter operations

## Troubleshooting

### CORS Issues
- Ensure backend `.env` has correct `CORS_ORIGIN`
- Verify frontend API URL in `.env`

### 401 Errors
- Check token is being sent in headers
- Verify JWT_SECRET matches between frontend and backend

### Data Mismatch
- Check backend response structure
- Ensure frontend maps data correctly

### Connection Refused
- Confirm backend is running on port 5000
- Check network connectivity

## Resources

- Backend API Documentation: See `backend/README.md`
- Service Files: `frontend/src/services/`
- Example Components: Update existing pages to use new services
