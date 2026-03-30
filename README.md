# 🎮 GameNode — Intelligent Gaming Dashboard

A centralized gaming dashboard that connects to the Steam Web API to retrieve your game library, track achievements, manage leaderboards, and deliver AI-powered game recommendations.

---

## Sprint Status

| Sprint | Duration | Goal | Status |
|--------|----------|------|--------|
| Sprint 1 | Feb 26, 2026 – Mar 17, 2026 | User authentication, JWT-secured routes, Steam game library retrieval | ✅ Complete |
| Sprint 2 | Mar 18, 2026 – Mar 31, 2026 | Centralized dashboard, achievements, favorites, leaderboards, player counts and news | ✅ Complete |

---

## Team Members

| Name | Role | Responsibilities |
|------|------|-----------------|
| Nahian Tasnim | Frontend Lead | React UI components, Formik forms, routing, global styling, auth context, dashboard context |
| Dhruvkumar Parmar | Backend Lead | Express server, REST API endpoints, Steam API integration, route setup |
| Chathurya Sudhakarreddy | Database Design | MongoDB schemas, Mongoose models, database queries, indexing |
| Akshitha Reddy Gangidi | Integration + Frontend and Backend assistant | Integration, backend endpoints |
| Akshat Shah | Security | bcrypt password hashing, JWT generation and verification, auth middleware, rate limiting, input validation |

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | v18+ | Server runtime |
| Express.js | ^4.18.2 | REST API framework |
| MongoDB | v6+ | NoSQL database |
| Mongoose | ^8.0.3 | MongoDB object modeling |
| bcryptjs | ^2.4.3 | Password hashing |
| jsonwebtoken | ^9.0.2 | JWT token generation and verification |
| axios | ^1.6.0 | Steam API HTTP requests |
| express-validator | ^7.0.1 | Input validation |
| express-rate-limit | ^7.1.5 | API rate limiting |
| node-cache | ^5.1.2 | Steam API response caching |
| morgan | ^1.10.0 | HTTP request logging |
| dotenv | ^16.3.1 | Environment variable management |
| cors | ^2.8.5 | Cross-origin resource sharing |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | ^18.2.0 | UI component library |
| React Router DOM | ^6.20.0 | Client-side routing |
| Formik | ^2.4.5 | Form state management |
| Yup | ^1.3.2 | Form validation schemas |
| Axios | ^1.6.0 | HTTP client for API calls |
| DOMPurify | ^3.0.6 | Input sanitization |

### Testing
| Technology | Purpose |
|-----------|---------|
| Jest | Test runner for backend |
| Supertest | HTTP endpoint testing |
| React Testing Library | Frontend component testing |

---

## Project Structure

```
gamenode/
│
├── README.md
├── .gitignore
│
├── server/
│   ├── package.json
│   ├── .gitignore
│   ├── .env.example
│   ├── index.js
│   │
│   ├── config/
│   │   └── db.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Game.js
│   │   ├── Achievement.js
│   │   ├── Favorite.js
│   │   ├── Leaderboard.js
│   │   └── NewsCache.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── steamRoutes.js
│   │   ├── achievementRoutes.js
│   │   ├── favoritesRoutes.js
│   │   ├── leaderboardRoutes.js
│   │   ├── publicLeaderboardRoutes.js
│   │   └── newsRoutes.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   ├── dashboardValidation.js
│   │   ├── achievementValidation.js
│   │   ├── favoritesValidation.js
│   │   └── leaderboardValidation.js
│   │
│   ├── utils/
│   │   ├── passwordUtils.js
│   │   ├── tokenUtils.js
│   │   ├── steamService.js
│   │   ├── favoritesEnrichment.js
│   │   └── csvExport.js
│   │
│   └── tests/
│
└── client/
    ├── package.json
    ├── .gitignore
    ├── .env
    │
    ├── public/
    │   └── index.html
    │
    └── src/
        ├── index.js
        ├── App.js
        │
        ├── styles/
        │   └── global.css
        │
        ├── services/
        │   └── axiosConfig.js
        │
        ├── store/
        │   ├── auth/
        │   │   └── authContext.js
        │   └── dashboard/
        │       └── dashboardContext.js
        │
        ├── components/
        │   ├── ProtectedRoute/
        │   │   └── ProtectedRoute.jsx
        │   ├── Layout/
        │   │   └── Navbar.jsx
        │   └── GameCard/
        │       ├── GameCard.jsx
        │       ├── NewsCard.jsx
        │       ├── NewsSection.jsx
        │       └── PlayerCountBadge.jsx
        │
        ├── pages/
        │   ├── Auth/
        │   │   ├── Register.jsx
        │   │   └── Login.jsx
        │   ├── Dashboard/
        │   │   ├── Dashboard.jsx
        │   │   └── GameDetail.jsx
        │   ├── Achievements/
        │   │   └── AchievementsPage.jsx
        │   ├── Favorites/
        │   │   └── FavoritesPage.jsx
        │   ├── Leaderboard/
        │   │   └── LeaderboardPage.jsx
        │   ├── Steam/
        │   │   └── SteamConnect.jsx
        │   └── ErrorPages.jsx
        │
        └── tests/
            
```

## API Endpoints

All protected endpoints require the header: `Authorization: Bearer <token>`

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login and receive JWT token |
| GET | `/api/auth/me` | Yes | Get current authenticated user |

### Steam
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/steam/connect` | Yes | Link a Steam account |
| GET | `/api/steam/dashboard` | Yes | Get paginated game library with sort and playtime stats |
| GET | `/api/steam/game/:appId` | Yes | Get aggregated game detail — playtime, player count, news, achievements |
| GET | `/api/steam/playercount/:appId` | Yes | Get current player count for a game |
| GET | `/api/steam/news/:appId` | Yes | Get recent news for a game with optional count param |
| POST | `/api/steam/sync` | Yes | Force refresh game library cache |

### Achievements
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/achievements/:appId` | Yes | Fetch achievements from Steam and save snapshot to DB |
| GET | `/api/achievements/:appId/cached` | Yes | Return cached achievements from DB without calling Steam |

### Favorites
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/favorites` | Yes | Get all favorite games with enriched data |
| POST | `/api/favorites` | Yes | Add a game to favorites |
| DELETE | `/api/favorites/:appId` | Yes | Remove a game from favorites |

### Leaderboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/leaderboard` | Yes | Get all leaderboard entries for the current user |
| POST | `/api/leaderboard` | Yes | Create a new leaderboard entry |
| PUT | `/api/leaderboard/:id` | Yes | Update an existing entry |
| DELETE | `/api/leaderboard/:id` | Yes | Delete an entry |
| GET | `/api/leaderboard/public/:userId` | No | View public entries for any user without login |
| GET | `/api/leaderboard/public/:userId/csv` | No | Download public entries as a CSV file |

### News
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/news/:appId` | Yes | Get news with MongoDB caching and stale cache fallback |

### Health Check
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Check server status |

---

## Setup Instructions

### Prerequisites

| Tool | Version | Download |
|------|---------|---------|
| Node.js | v18 or higher | https://nodejs.org |
| MongoDB | v6 or higher | https://www.mongodb.com/try/download/community |
| Git | Latest | https://git-scm.com |

You will also need a free Steam Web API key from https://steamcommunity.com/dev/apikey

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-team/gamenode.git
cd gamenode
```

### Step 2 — Install Backend Dependencies

```bash
cd server
npm install
```

### Step 3 — Install Frontend Dependencies

```bash
cd client
npm install
```

### Step 4 — Start MongoDB

**macOS with Homebrew:**
```bash
brew services start mongodb-community
```

**macOS or Linux manual:**
```bash
mongod --dbpath /usr/local/var/mongodb
```

**Windows:**
```bash
mongod --dbpath "C:\data\db"
```

### Step 5 — Configure Environment Variables

Fill the values in .env file

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/gamenode
JWT_SECRET=replace_this_with_a_long_random_string_minimum_32_characters
JWT_EXPIRES_IN=24h
STEAM_API_KEY=your_steam_api_key_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
STEAM_RATE_LIMIT_MAX=30
DASHBOARD_RATE_LIMIT_MAX=20
LEADERBOARD_RATE_LIMIT_MAX=25
NEWS_RATE_LIMIT_MAX=15
PLAYER_COUNT_RATE_LIMIT_MAX=40
```

### Step 6 — Start the Backend Server

```bash
cd server
npm run dev
```

Confirm it is running at `http://localhost:5000/api/health`

### Step 7 — Start the Frontend

```bash
cd client
npm start
```

The app opens at `http://localhost:3000`

### Step 8 — Run Tests

**All backend tests:**
```bash
cd server && npm test
```


**Frontend tests:**
```bash
cd client && npm test
```



## Troubleshooting

| Problem | Solution |
|---------|----------|
| MongoDB connection failed | Make sure MongoDB is running on port 27017 |
| npm install fails | Make sure Node.js v18 or higher is installed |
| Cannot GET /api/health | Make sure the backend server is running on port 5000 |
| Network Error in browser | Make sure both backend on port 5000 and frontend on port 3000 are running |
| 401 Unauthorized on all requests | Your JWT token has expired — log out and log back in |
| Steam ID not found | Verify you are entering the correct 17-digit Steam ID |
| Steam profile is private | Go to Steam settings and set your profile visibility to Public |
| 503 Steam API unavailable | The Steam API is temporarily down — try again in a few minutes |
| Games not loading after Steam connect | Make sure your Steam profile is Public and your library is not empty |
| Achievements not available | Not all games support Steam achievements — the game must have achievements enabled |
| Leaderboard entry not saving | Make sure playerName, game, and score are all filled in and score is 0 or greater |
| News not loading | Steam news API may be temporarily unavailable — a cached version will be shown if available |

---

## License

This project is licensed under the [MIT License](LICENSE).

---

*This README covers Sprint 1 and Sprint 2.*
*It will be updated during each sprint to reflect newly added features, any changes to setup, and updated project structure.*

*Last updated: Sprint 2 — March 2026*
