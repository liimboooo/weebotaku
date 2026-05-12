# Package.json Dependencies Guide

## Complete Dependencies List

```json
{
  "name": "animewch-advanced",
  "version": "2.0.0",
  "description": "Advanced anime editing platform with gamification, real-time features, and video streaming",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "node scripts/seed.ts",
    "cron:streaks": "node scripts/cron/reset-streaks.ts",
    "cron:trending": "node scripts/cron/update-trending.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^6.0.0",
    "next-auth": "^4.24.0",
    "@next-auth/prisma-adapter": "^1.2.0",
    "argon2": "^0.30.0",
    "redis": "^4.6.0",
    "winston": "^3.11.0",
    "@sentry/nextjs": "^7.97.0",
    "cloudinary": "^2.0.0",
    "helmet": "^7.1.0",
    "node-cron": "^3.0.0",
    "email-validator": "^2.1.0",
    "zod": "^3.22.0",
    "axios": "^1.6.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@prisma/cli": "^6.0.0",
    "prisma": "^6.0.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0",
    "ts-node": "^10.9.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0",
    "eslint": "^8.54.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

---

## Dependency Descriptions

### Core Framework
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `next` | 15.0.0+ | React framework | API routes, SSR, edge functions |
| `react` | 19.0.0+ | UI library | Component rendering |
| `react-dom` | 19.0.0+ | DOM rendering | Client-side rendering |

### Database & ORM
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@prisma/client` | 6.0.0+ | Database client | Type-safe queries |
| `prisma` | 6.0.0+ | ORM & migration tool | Schema management |
| `@prisma/cli` | 6.0.0+ | Prisma CLI | Database operations |

### Authentication
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `next-auth` | 4.24.0+ | Authentication | OAuth, sessions |
| `@next-auth/prisma-adapter` | 1.2.0+ | Database adapter | Prisma integration |

### Security
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `argon2` | 0.30.0+ | Password hashing | Industry standard |
| `helmet` | 7.1.0+ | Security headers | Express middleware |

### Caching & Real-time
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `redis` | 4.6.0+ | Cache & pub/sub | In-memory store |
| `node-cron` | 3.0.0+ | Scheduled jobs | Cron tasks |

### Video & Media
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `cloudinary` | 2.0.0+ | Video platform | Upload, transcoding |

### Logging & Monitoring
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `winston` | 3.11.0+ | Logger | File logging |
| `@sentry/nextjs` | 7.97.0+ | Error tracking | Exception reporting |

### Data Validation
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `zod` | 3.22.0+ | Schema validation | Type-safe validation |
| `email-validator` | 2.1.0+ | Email validation | RFC 5322 compliance |

### HTTP & API
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `axios` | 1.6.0+ | HTTP client | API requests |

### Configuration
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `dotenv` | 16.3.0+ | Environment vars | Configuration |

### TypeScript & Types
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `typescript` | 5.3.0+ | Type checker | Type safety |
| `@types/node` | 20.10.0+ | Node types | Type definitions |
| `@types/react` | 18.2.0+ | React types | Component types |
| `@types/jest` | 29.5.0+ | Jest types | Test types |

### Testing
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `jest` | 29.7.0+ | Test runner | Unit testing |
| `ts-jest` | 29.1.0+ | TypeScript Jest | TS support |
| `@testing-library/react` | 14.1.0+ | React testing | Component testing |
| `@testing-library/jest-dom` | 6.1.0+ | DOM matchers | Jest DOM helpers |

### Linting
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `eslint` | 8.54.0+ | Code linting | Code quality |
| `eslint-config-next` | 15.0.0+ | Next.js config | Next.js rules |

---

## Installation Commands

### Install All Dependencies
```bash
npm install
```

### Install Production Dependencies Only
```bash
npm install --production
```

### Install Specific Groups

**Database & ORM**
```bash
npm install @prisma/client prisma @prisma/cli
```

**Authentication**
```bash
npm install next-auth @next-auth/prisma-adapter
```

**Security & Caching**
```bash
npm install argon2 redis helmet node-cron
```

**Video Processing**
```bash
npm install cloudinary
```

**Logging & Monitoring**
```bash
npm install winston @sentry/nextjs
```

**Validation**
```bash
npm install zod email-validator axios dotenv
```

**Development Only**
```bash
npm install --save-dev typescript @types/node @types/react jest ts-jest ts-node eslint
```

---

## Version Considerations

### PostgreSQL
```bash
# Minimum version: 13
psql --version
```

### Node.js
```bash
# Minimum version: 18 LTS
node --version
```

### npm
```bash
# Minimum version: 8
npm --version
```

---

## Breaking Changes & Migrations

### From Previous Version
If upgrading from v1.0, run:
```bash
npm install
npx prisma migrate deploy
npx prisma generate
```

### Prisma Migration
```bash
# Create new migration
npx prisma migrate dev --name add_bounty_fields

# Apply existing migrations
npx prisma migrate deploy

# Reset database (dev only!)
npx prisma migrate reset
```

---

## Common Installation Issues

### Issue: PostgreSQL Connection Error
**Solution**: Check DATABASE_URL in .env.local

### Issue: Redis Connection Refused
**Solution**: Ensure Redis running on localhost:6379
```bash
redis-cli ping  # Should return PONG
```

### Issue: Prisma Client Not Found
**Solution**: Generate Prisma client
```bash
npx prisma generate
```

### Issue: argon2 Installation Fails
**Solution**: Install build tools (Windows/Linux/Mac specific)
```bash
# Windows
npm install --build-from-source

# macOS
brew install python3
npm install
```

### Issue: Module Not Found Errors
**Solution**: Clear cache and reinstall
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

---

## Production Setup

### Build for Production
```bash
npm run build
npm start
```

### Performance Optimizations
1. Remove unused dependencies
2. Use `npm prune --production` before deployment
3. Enable minification (Next.js default)
4. Configure CDN for static assets
5. Use Redis for session storage

---

## Optional Packages for Advanced Features

### WebSocket Support
```bash
npm install socket.io socket.io-client
```

### Message Queue (Background Jobs)
```bash
npm install bullmq
```

### GraphQL Support (Alternative to REST)
```bash
npm install apollo-server-next graphql
```

### File Upload
```bash
npm install multer formidable
```

### Email Notifications
```bash
npm install nodemailer
```

---

## Lock File

Always commit `package-lock.json` to ensure consistent versions:

```bash
git add package-lock.json
git commit -m "Lock dependencies"
```

---

## Health Check

Verify installation:
```bash
node --version          # Check Node
npm --version           # Check npm
npx prisma --version    # Check Prisma
redis-cli --version     # Check Redis
```

Expected output example:
```
v18.17.0 (Node)
9.8.1 (npm)
5.2.0 (Prisma)
7.0.0 (Redis)
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Setup database | `npx prisma migrate dev` |
| Open DB UI | `npx prisma studio` |
| Generate types | `npx prisma generate` |
| Run dev server | `npm run dev` |
| Build for prod | `npm run build` |
| Start prod server | `npm start` |
| Run tests | `npm test` |
| Reset database | `npx prisma migrate reset` |
| Check types | `npm run type-check` |
| Lint code | `npm run lint` |
| Cron: reset streaks | `npm run cron:streaks` |
| Cron: update trending | `npm run cron:trending` |

---

## Dependency Graph

```
Next.js Framework
├── React 19
├── TypeScript 5
└── Prisma ORM
    ├── @prisma/client
    ├── PostgreSQL 13+
    └── prisma CLI

Authentication Layer
├── NextAuth.js 4
├── @next-auth/prisma-adapter
└── OAuth (Google, Discord)

Security & Hashing
├── Argon2
├── Helmet
└── Zod validation

Caching & Real-time
├── Redis 4
├── node-cron 3
└── Server-Sent Events (built-in)

Video Processing
├── Cloudinary
├── HLS streaming
└── DASH streaming

Logging & Monitoring
├── Winston
└── Sentry

HTTP Client
└── Axios

Development Tools
├── ESLint
├── Jest (testing)
├── TypeScript compiler
└── ts-node
```

---

## Performance Benchmarks (Per 1000 deps)

- Install time: ~30-60 seconds
- Bundle size: ~2.5MB (production)
- Development overhead: ~500MB node_modules

---

**Version Last Updated**: January 2025
