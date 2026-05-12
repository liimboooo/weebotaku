# Setup & Installation Guide

Complete setup instructions for running the AnimeWch full-stack application.

## 📋 System Requirements

- **Node.js** v16 or higher
- **npm** v8 or higher (comes with Node.js)
- **MongoDB** v4.4 or higher (local installation or MongoDB Atlas cloud)
- **Git** (optional, for cloning)

## 🖥️ Local Development Setup

### Step 1: MongoDB Setup

#### Option A: Local MongoDB

**Windows:**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer and follow instructions
3. Verify installation: Open PowerShell and run `mongod --version`
4. Start MongoDB: Run `mongod` command

**macOS (with Homebrew):**
```bash
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu):**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

#### Option B: MongoDB Atlas (Cloud)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a cluster
4. Get connection string: `mongodb+srv://user:password@cluster.mongodb.net/animewch`
5. Note the connection string for later

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your settings
```

**Edit `.backend/.env`:**
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/animewch
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/animewch

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
```

**Start the backend:**
```bash
npm run dev
```

Output should show:
```
Server is running on port 5000
MongoDB connected successfully
```

### Step 3: Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
echo REACT_APP_API_URL=http://localhost:5000/api > .env
```

**Or manually edit `.frontend/.env`:**
```
REACT_APP_API_URL=http://localhost:5000/api
```

**Start the frontend:**
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`

## ✅ Verification Checklist

After setup, verify everything is working:

- [ ] Backend running on port 5000
- [ ] MongoDB connected without errors
- [ ] Frontend running on port 3000
- [ ] Browser loads the application
- [ ] Can navigate to login page
- [ ] No CORS errors in browser console

### Testing API Connection

**Test 1: Health Check**
```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{"success": true, "message": "Server is running"}
```

**Test 2: Register New User**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "passwordConfirm": "password123"
  }'
```

Should return a token and user data.

**Test 3: Get Anime**
```bash
curl http://localhost:5000/api/anime
```

Should return an empty array (if no data added yet).

## 🚀 Running the Application

### Using npm scripts

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Using VS Code

1. Open project in VS Code
2. Open 2 integrated terminals (Terminal > New Terminal)
3. In Terminal 1: `cd backend && npm run dev`
4. In Terminal 2: `cd frontend && npm start`

### Using npm concurrently (Optional)

Install globally:
```bash
npm install -g concurrently
```

From root directory:
```bash
concurrently "cd backend && npm run dev" "cd frontend && npm start"
```

## 📝 First Steps in the App

### 1. Create an Account
1. Click "Login / Register"
2. Fill in the registration form
3. Submit to create account
4. You'll be logged in automatically

### 2. Browse Anime
1. Go to Browse page
2. See anime catalog (may be empty initially)
3. Try adding an anime to watchlist

### 3. Explore Features
- **Watchlist** - Add/remove anime
- **Search** - Search for specific titles
- **Profile** - View your profile
- **Community** - Create or view posts

## 🔧 Configuration

### Backend Configuration (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | Database URL | mongodb://localhost:27017/animewch |
| `JWT_SECRET` | Secret key for JWT | (required) |
| `JWT_EXPIRE` | Token expiration | 7d |
| `CORS_ORIGIN` | Frontend URL | http://localhost:3000 |

### Frontend Configuration (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | http://localhost:5000/api |

## 🐛 Troubleshooting

### MongoDB Connection Error

**Error:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution:**
- Make sure MongoDB is running
- Check MONGODB_URI in .env
- For local: Run `mongod` in a separate terminal
- For Atlas: Verify connection string and network access

### CORS Error in Browser Console

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**
- Check `CORS_ORIGIN` in backend .env matches frontend URL
- Restart backend after changing .env
- Clear browser cache

### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solution:**
- Check if another process is using port 5000: `lsof -i :5000`
- Kill the process: `kill -9 <PID>`
- Or change PORT in .env

### Frontend Can't Connect to Backend

**Error:** `Failed to fetch` or `net::ERR_CONNECTION_REFUSED`

**Solution:**
- Verify backend is running: `curl http://localhost:5000/api/health`
- Check `REACT_APP_API_URL` in frontend .env
- Restart frontend: `npm start`

### Token Issues / Keep Getting Logged Out

**Solution:**
- Clear localStorage: Open DevTools > Application > Clear all
- Re-login
- Verify JWT_SECRET is set and consistent

### 401 Unauthorized on Protected Routes

**Solution:**
- Check if token is in localStorage
- Verify token hasn't expired (7 days by default)
- Re-login to get new token

## 📱 Mobile/Responsive Testing

The application is responsive and works on mobile devices.

**Test on mobile:**
1. Open `http://localhost:3000` on your phone (same WiFi)
2. Or use Chrome DevTools device emulation (F12 > Toggle device toolbar)

## 🔒 Production Deployment

### Before Deploying

1. Change `JWT_SECRET` to a strong random string
2. Set `NODE_ENV=production`
3. Use production MongoDB URI
4. Enable HTTPS
5. Set appropriate `CORS_ORIGIN`
6. Add environment-specific logging

### Backend Deployment (Heroku Example)

```bash
cd backend

# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-production-secret
heroku config:set MONGODB_URI=your-production-mongodb-uri
heroku config:set CORS_ORIGIN=https://your-frontend-domain.com

# Deploy
git push heroku main
```

### Frontend Deployment (Vercel Example)

```bash
cd frontend

# Build for production
npm run build

# Deploy with Vercel
npm install -g vercel
vercel --prod
```

Set environment variable:
- `REACT_APP_API_URL=https://your-backend-url.com/api`

## 📊 Database Seeding (Optional)

To add sample data to the database:

1. Create sample anime data (connect to Jikan API or add manually)
2. Use MongoDB client to insert documents
3. Or create a seed script

Example with MongoDB client:
```javascript
db.anime.insertMany([
  {
    animeId: 1,
    title: "Cowboy Bebop",
    episodes: 26,
    rating: 8.74
  },
  // ... more anime
]);
```

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Step-by-step integration |
| [COMPONENT_EXAMPLES.md](COMPONENT_EXAMPLES.md) | Code examples |
| [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md) | Architecture overview |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Quick API reference |
| [backend/README.md](backend/README.md) | Backend documentation |

## ❓ Getting Help

1. Check the troubleshooting section above
2. Review documentation files
3. Check browser console for errors (F12)
4. Check backend terminal for server errors
5. Verify all environment variables are set correctly

## 🎓 Learning Resources

- **Node.js:** https://nodejs.org/en/docs/
- **Express:** https://expressjs.com/
- **MongoDB:** https://docs.mongodb.com/
- **React:** https://react.dev/
- **JWT:** https://jwt.io/

## 🔄 Development Workflow

1. Make changes to frontend/backend code
2. Frontend auto-reloads with `npm start`
3. Backend auto-reloads with `npm run dev` (nodemon)
4. Test in browser
5. Check console for errors
6. Repeat

## 📦 Dependency Updates

Keep dependencies up to date:

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## 🎯 Next Steps After Setup

1. ✅ Verify everything is running
2. ⏳ Create a test account
3. ⏳ Explore the application
4. ⏳ Start integrating backend with frontend components
5. ⏳ Add sample anime data to database
6. ⏳ Test all features
7. ⏳ Deploy to production

## 💡 Tips & Best Practices

- Use VS Code for development (great extensions available)
- Keep separate terminals for frontend and backend
- Check console logs frequently
- Use browser DevTools for debugging
- Test on different screen sizes
- Use Git for version control
- Commit regularly

---

**Happy Coding!** 🚀

For more information, see the documentation files in the project root.
