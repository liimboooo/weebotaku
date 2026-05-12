# AnimeWch Backend API

Express.js + MongoDB REST API with JWT authentication for the AnimeWch platform.

## Tech Stack

- **Runtime:** Node.js (v24.15.0)
- **Framework:** Express 4.21
- **Database:** MongoDB via Mongoose 8.7 (local or in-memory fallback)
- **Auth:** JWT (jsonwebtoken 9) + bcryptjs
- **Security:** express-rate-limit, CORS
- **Dev:** `node --watch` for auto-reload

## Database

`config/db.js` — Auto-detection fallback:
1. Tries `MONGODB_URI` env var or `mongodb://127.0.0.1:27017/animewch`
2. Falls back to `mongodb-memory-server` (zero-config, data lost on restart)

---

## Models

### User (`models/User.js`)
| Field | Type | Notes |
|-------|------|-------|
| `username` | String | unique, 2-30 chars |
| `email` | String | unique, lowercase |
| `password` | String | bcrypt hashed, min 4 chars |
| `avatar` | String | URL or base64 |
| `bio` | String | max 500 |
| `statusMessage` | String | max 100 |
| `watchlist` | [{animeId, name, img, rating, episodes, year, status, genres}] | Embedded array |
| `readlist` | [{mangaId, title, cover, author, rating, ch, status, demo}] | Embedded array |
| `ratings` | Map<animeId, Number> | 1-10 |
| `likedAnime` | [Number] | Array of anime IDs |
| `watchHistory` | [{animeId, episode, animeName, animeImg, timestamp}] | Last 100 entries |
| `memberSince` | Number | Year |
| `role` | String | 'user' or 'admin' |

**Methods:** `matchPassword()`, `getSignedJwtToken()`, `toPublic()`

### Review (`models/Review.js`)
| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId (ref User) | |
| `animeId` | Number | optional |
| `mangaId` | String | optional |
| `rating` | Number | 1-10 |
| `title` | String | max 200 |
| `content` | String | max 5000 |
| `isSpoiler` | Boolean | |
| `likes` | [ObjectId] | |

**Indexes:** Unique compound indexes on `(user + animeId)` and `(user + mangaId)` — one review per user per anime/manga.

### CommunityPost (`models/CommunityPost.js`)
| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId (ref User) | |
| `title` | String | max 200 |
| `content` | String | max 10000 |
| `category` | String | discussion, review, recommendation, meme, fanart, question, other |
| `tags` | [String] | |
| `images` | [String] | |
| `likes` | [ObjectId] | |
| `comments` | [{user, content, createdAt}] | Embedded subdocs, max 2000 chars each |

---

## API Endpoints

Base URL: `http://localhost:5000/api`

### Auth `/api/auth`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Register (username, email, password, passwordConfirm) |
| POST | `/login` | ❌ | Login (username or email + password) |
| GET | `/me` | ✅ | Get current user profile |
| PUT | `/updateprofile` | ✅ | Update username, bio, avatar, statusMessage |
| GET | `/logout` | ✅ | Logout (clears server-side state if any) |

**Rate limiting:** Auth endpoints: 20 req/15min. General API: 200 req/15min.

### Anime `/api/anime`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/watchlist` | ✅ | Get user's anime watchlist |
| POST | `/:id/watchlist` | ✅ | Add anime to watchlist |
| DELETE | `/:id/watchlist` | ✅ | Remove anime from watchlist |
| GET | `/history` | ✅ | Get watch history |
| POST | `/:id/history` | ✅ | Add watch history entry |
| GET | `/ratings` | ✅ | Get all user ratings |
| POST | `/:id/rate` | ✅ | Rate anime (1-10) |
| GET | `/liked` | ✅ | Get liked anime IDs |
| POST | `/:id/like` | ✅ | Toggle like on anime |

### Manga `/api/manga`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/readlist` | ✅ | Get user's manga readlist |
| POST | `/:id/list` | ✅ | Add manga to readlist |
| DELETE | `/:id/list` | ✅ | Remove manga from readlist |

### Reviews `/api/reviews`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Create review (animeId or mangaId + rating, title, content) |
| GET | `/:type/:id` | ❌ | Get reviews (type=anime or manga, id=the ID, ?page=&limit=) |
| POST | `/:id/like` | ✅ | Toggle like on review |
| DELETE | `/:id` | ✅ | Delete review (owner or admin) |

### Community `/api/community`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | Get posts (?page=&limit=&category=) |
| POST | `/` | ✅ | Create post (title, content, category, tags, images) |
| GET | `/:id` | ❌ | Get post by ID (populates user + comments) |
| POST | `/:id/like` | ✅ | Toggle like on post |
| POST | `/:id/comment` | ✅ | Add comment (content) |
| DELETE | `/:id` | ✅ | Delete post (owner or admin) |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check, returns timestamp |

---

## Middleware

### `middleware/auth.js`
- `protect` — Requires valid JWT in `Authorization: Bearer <token>` header. Attaches `req.user`.
- `optionalAuth` — Attaches user if token present, doesn't block if missing.
- `admin` — Checks `req.user.role === 'admin'`.

### Rate Limiting (`server.js`)
- Global: 200 requests per 15 min window
- Auth (login/register): 20 requests per 15 min window

### CORS
Allowed origins: `http://localhost:3000`, `http://127.0.0.1:3000`

---

## Environment (`.env`)
```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/animewch
JWT_SECRET=animewch_super_secret_jwt_key_2026_change_me
JWT_EXPIRE=30d
NODE_ENV=development
```

---

## Running

```bash
cd backend
npm install        # already done
npm start          # node server.js
npm run dev        # node --watch server.js (auto-reload)
```

---

## Frontend Connection

Frontend (`frontend/src/services/api.js`) points to `http://localhost:5000/api`.  
The `authService` sends JWT token automatically. On 401, it clears auth state and redirects to `/`.  
`storage.js` syncs watchlist, readlist, history, ratings, and likes bidirectionally after login via `syncFromBackend()`.
