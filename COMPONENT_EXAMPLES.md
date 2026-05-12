# Component Integration Examples

This file contains examples of how to integrate backend API services into your React components.

## 1. AuthPage Component

Example implementation using `authService`:

```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirm: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await authService.login(formData.email, formData.password);
      } else {
        if (formData.password !== formData.passwordConfirm) {
          throw new Error('Passwords do not match');
        }
        result = await authService.register(
          formData.username,
          formData.email,
          formData.password,
          formData.passwordConfirm
        );
      }

      if (result.success) {
        navigate('/home');
      } else {
        setError(result.message || 'Authentication failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit}>
        <h1>{isLogin ? 'Login' : 'Register'}</h1>
        
        {!isLogin && (
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        )}
        
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        
        {!isLogin && (
          <input
            type="password"
            name="passwordConfirm"
            placeholder="Confirm Password"
            value={formData.passwordConfirm}
            onChange={handleChange}
            required
          />
        )}
        
        {error && <div className="error">{error}</div>}
        
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
        </button>
        
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="toggle"
        >
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
        </button>
      </form>
    </div>
  );
}
```

## 2. Browse Component with Backend API

Example of updating Browse to use backend API:

```javascript
import React, { useState, useEffect } from 'react';
import animeService from '../services/animeService';
import { usePaginated } from '../hooks/useAPI';

function Browse() {
  const [filters, setFilters] = useState({
    genre: '',
    year: '',
    status: '',
  });

  const { data: anime, loading, hasMore, loadMore } = usePaginated(
    async (params) => {
      return animeService.getAll({
        ...params,
        ...filters
      });
    },
    20
  );

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="browse">
      <div className="filters">
        <select onChange={(e) => handleFilterChange('genre', e.target.value)}>
          <option value="">All Genres</option>
          {/* Add genre options */}
        </select>
        
        <select onChange={(e) => handleFilterChange('year', e.target.value)}>
          <option value="">All Years</option>
          {/* Add year options */}
        </select>
      </div>

      <div className="grid">
        {anime.map(item => (
          <AnimeCard key={item._id} anime={item} />
        ))}
      </div>

      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## 3. WatchlistPage Component

```javascript
import React, { useEffect, useState } from 'react';
import animeService from '../services/animeService';

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      const result = await animeService.getWatchlist();
      setWatchlist(result.data || []);
    } catch (err) {
      console.error('Failed to load watchlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (animeId) => {
    try {
      await animeService.removeFromWatchlist(animeId);
      setWatchlist(prev => 
        prev.filter(item => item.animeId !== animeId)
      );
    } catch (err) {
      console.error('Failed to remove from watchlist:', err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="watchlist-page">
      <h1>My Watchlist ({watchlist.length})</h1>
      
      {watchlist.length === 0 ? (
        <div className="empty">
          <p>Your watchlist is empty</p>
        </div>
      ) : (
        <div className="grid">
          {watchlist.map(anime => (
            <div key={anime._id} className="card">
              <img src={anime.imageUrl} alt={anime.title} />
              <h3>{anime.title}</h3>
              <p>{anime.description}</p>
              <button onClick={() => handleRemove(anime.animeId)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 4. ProfilePage Component

```javascript
import React, { useEffect, useState } from 'react';
import authService from '../services/authService';
import { useMutation } from '../hooks/useAPI';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  const { mutate: updateProfile, loading } = useMutation(
    (data) => authService.updateProfile(data.username, data.bio, data.avatar)
  );

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const result = await authService.getMe();
      setUser(result.data);
      setFormData(result.data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await updateProfile(formData);
      setUser(result.data);
      setEditMode(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <img src={user.avatar} alt={user.username} />
        <h1>{user.username}</h1>
        <p>{user.bio}</p>
      </div>

      {editMode ? (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
          />
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({...formData, bio: e.target.value})}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => setEditMode(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <button onClick={() => setEditMode(true)}>Edit Profile</button>
      )}
    </div>
  );
}
```

## 5. Reviews Component

```javascript
import React, { useState, useEffect } from 'react';
import reviewService from '../services/reviewService';

export default function Reviews({ animeId }) {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    content: ''
  });

  useEffect(() => {
    loadReviews();
  }, [animeId]);

  const loadReviews = async () => {
    try {
      const result = await reviewService.getReviews('anime', animeId);
      setReviews(result.data || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const review = await reviewService.createReview(
        animeId,
        null,
        newReview.rating,
        newReview.title,
        newReview.content
      );
      setReviews([review.data, ...reviews]);
      setNewReview({ rating: 5, title: '', content: '' });
    } catch (err) {
      console.error('Failed to create review:', err);
    }
  };

  const handleLike = async (reviewId) => {
    try {
      await reviewService.likeReview(reviewId);
      loadReviews();
    } catch (err) {
      console.error('Failed to like review:', err);
    }
  };

  return (
    <div className="reviews">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Review Title"
          value={newReview.title}
          onChange={(e) => setNewReview({...newReview, title: e.target.value})}
          required
        />
        <select
          value={newReview.rating}
          onChange={(e) => setNewReview({...newReview, rating: parseInt(e.target.value)})}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <textarea
          placeholder="Write your review..."
          value={newReview.content}
          onChange={(e) => setNewReview({...newReview, content: e.target.value})}
          required
        />
        <button type="submit">Submit Review</button>
      </form>

      <div className="review-list">
        {reviews.map(review => (
          <div key={review._id} className="review-item">
            <h4>{review.title}</h4>
            <p>⭐ {review.rating}/10</p>
            <p>{review.content}</p>
            <button onClick={() => handleLike(review._id)}>
              👍 {review.likes}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 6. Community Posts Component

```javascript
import React, { useState, useEffect } from 'react';
import communityService from '../services/communityService';

export default function CommunityFeed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'discussion'
  });

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const result = await communityService.getAllPosts({
        page: 1,
        limit: 20
      });
      setPosts(result.data || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      const post = await communityService.createPost(
        newPost.title,
        newPost.content,
        newPost.category
      );
      setPosts([post.data, ...posts]);
      setNewPost({ title: '', content: '', category: 'discussion' });
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  const handleLike = async (postId) => {
    try {
      await communityService.likePost(postId);
      loadPosts();
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  return (
    <div className="community-feed">
      <form onSubmit={handleCreatePost}>
        <input
          type="text"
          placeholder="Post Title"
          value={newPost.title}
          onChange={(e) => setNewPost({...newPost, title: e.target.value})}
          required
        />
        <select
          value={newPost.category}
          onChange={(e) => setNewPost({...newPost, category: e.target.value})}
        >
          <option value="discussion">Discussion</option>
          <option value="artwork">Artwork</option>
          <option value="meme">Meme</option>
          <option value="fan-fiction">Fan Fiction</option>
          <option value="news">News</option>
        </select>
        <textarea
          placeholder="What's on your mind?"
          value={newPost.content}
          onChange={(e) => setNewPost({...newPost, content: e.target.value})}
          required
        />
        <button type="submit">Post</button>
      </form>

      <div className="posts-list">
        {posts.map(post => (
          <div key={post._id} className="post-card">
            <h3>{post.title}</h3>
            <p>{post.content}</p>
            <span className="category">{post.category}</span>
            <div className="post-actions">
              <button onClick={() => handleLike(post._id)}>
                ❤️ {post.likes}
              </button>
              <span>💬 {post.comments?.length || 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 7. Using the Custom Hooks

```javascript
import { useAPI, useMutation, usePaginated } from '../hooks/useAPI';
import animeService from '../services/animeService';

// Simple API fetch
function MyComponent() {
  const { data, loading, error } = useAPI(
    () => animeService.getTrending()
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{/* render data */}</div>;
}

// Mutation (POST, PUT, DELETE)
function UpdateComponent() {
  const { mutate, loading, error } = useMutation(
    (id) => animeService.removeFromWatchlist(id)
  );

  const handleRemove = async (id) => {
    try {
      await mutate(id);
      // Success!
    } catch (err) {
      console.error(err);
    }
  };

  return <button onClick={() => handleRemove(123)}>Remove</button>;
}

// Paginated data
function PaginatedComponent() {
  const { data, loading, hasMore, loadMore } = usePaginated(
    (params) => animeService.getAll(params),
    20
  );

  return (
    <div>
      {data.map(item => <div key={item._id}>{item.title}</div>)}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

## Best Practices

1. **Always handle errors** - Use try/catch blocks
2. **Show loading states** - Provide feedback to users
3. **Use the custom hooks** - Reusable and consistent
4. **Validate input** - Before sending to API
5. **Cache data** - Avoid unnecessary API calls
6. **Debounce searches** - Prevent too many requests
7. **Handle auth errors** - Redirect to login on 401
8. **Display messages** - Show success/error notifications

## Migration Checklist

- [ ] Add API service files (already done)
- [ ] Create custom hooks (already done)
- [ ] Update AuthPage
- [ ] Update Browse page
- [ ] Update Watchlist page
- [ ] Update Profile page
- [ ] Update Reviews components
- [ ] Update Community components
- [ ] Update News page
- [ ] Test all features
- [ ] Add error handling
- [ ] Add loading states
- [ ] Add success messages
