# 🎮 GameNode — Intelligent Gaming Dashboard

A centralized gaming dashboard that connects to the Steam Web API to retrieve your game library, track achievements, manage leaderboards, and deliver AI-powered game recommendations.

---

## Sprint 1 Status

**Sprint Duration:** February 26, 2026 – March 17, 2026

**Sprint Goal:** User authentication system, JWT-secured routes, and Steam game library retrieval.

---

## Team Members

| Name | Role | Responsibilities |
|------|------|-----------------|
| Nahian Tasnim | Frontend Lead | React UI components, Formik forms, routing, global styling, auth context, dashboard context |
| Dhruvkumar Parmar | Backend Lead | Express server, REST API endpoints, Steam API integration, route setup |
| Chathurya Sudhakarreddy | Database Design | MongoDB schemas, Mongoose models, database queries, indexing |
| Akshitha Reddy Gangidi | QA and Steam API | Integration testing, backend tests, frontend tests, Steam API verification |
| Akshat Shah | Security | bcrypt password hashing, JWT generation and verification, auth middleware, rate limiting |

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
│   │   └── Game.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── steamRoutes.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   │
│   ├── utils/
│   │   ├── passwordUtils.js
│   │   ├── tokenUtils.js
│   │   └── steamService.js
│   │
│   └── tests/
│       └── auth.test.js
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
        │       └── GameCard.jsx
        │
        ├── pages/
        │   ├── Auth/
        │   │   ├── Register.jsx
        │   │   └── Login.jsx
        │   ├── Dashboard/
        │   │   └── Dashboard.jsx
        │   ├── Steam/
        │   │   └── SteamConnect.jsx
        │   └── ErrorPages.jsx
        │
        └── tests/
            └── auth.integration.test.js
```

## API Endpoints

All protected endpoints require the header: `Authorization: Bearer <token>`

### Authentication
| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login and receive JWT token |
| GET | `/api/auth/me` | Yes | Get current authenticated user |

### Steam
| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| POST | `/api/steam/connect` | Yes | Link a Steam account |
| GET | `/api/steam/dashboard` | Yes | Get paginated game library |
| GET | `/api/steam/playercount/:appId` | Yes | Get current player count for a game |
| GET | `/api/steam/news/:appId` | Yes | Get recent news for a game |
| POST | `/api/steam/sync` | Yes | Force refresh game library cache |

### Health Check
| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| GET | `/api/health` | No | Check server status |

---

## Database Schemas

### User
| Field | Type | Description |
|-------|------|-------------|
| username | String | Unique, 3 to 20 characters, letters, numbers, underscores only |
| email | String | Unique, valid email format |
| passwordHash | String | bcrypt hash, never stored as plain text |
| steamId | String | 17-digit Steam ID, null until the user links their account |
| role | String | Either 'user' or 'admin', defaults to 'user' |
| createdAt | Date | Auto-generated on creation |
| updatedAt | Date | Auto-updated on every change |

### Game
| Field | Type | Description |
|-------|------|-------------|
| appId | String | Steam App ID, unique |
| name | String | Game name |
| imgIconUrl | String | Steam icon image URL |
| lastFetchedAt | Date | Tracks when data was last fetched from Steam |

### UserGame
| Field | Type | Description |
|-------|------|-------------|
| userId | ObjectId | Reference to User document |
| appId | String | Steam App ID |
| name | String | Game name |
| playtimeForever | Number | Total minutes played, sourced from Steam |
| imgIconUrl | String | Icon image URL |
| lastSynced | Date | Timestamp of the last Steam API sync |

---

## Setup Instructions

### Prerequisites

Make sure the following are installed on your machine before starting.

| Tool | Version | Download |
|------|---------|---------|
| Node.js | v18 or higher | https://nodejs.org |
| MongoDB | v6 or higher | https://www.mongodb.com/try/download/community |
| Git | Latest | https://git-scm.com |

You will also need a free Steam Web API key. Get one at https://steamcommunity.com/dev/apikey — you need a Steam account to do this.

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-team/gamenode.git
cd gamenode
```

---

### Step 2 — Install Backend Dependencies

```bash
cd server
npm install
```

---

### Step 3 — Install Frontend Dependencies

Open a second terminal window.

```bash
cd client
npm install
```

---

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

Verify MongoDB is running by visiting `http://localhost:27017` in your browser. You should see a plain text message from MongoDB.

---

### Step 5 — Configure Environment Variables

Open `server/.env` and fill in the following values:

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
```

### Step 6 — Start the Backend Server

From the `server` folder:

```bash
npm run dev
```

You should see:

```
🎮 GameNode API running on port 5000
   Environment: development
   Health check: http://localhost:5000/api/health

MongoDB Connected: localhost
```

Confirm the server is running by opening `http://localhost:5000/api/health` in your browser.

---

### Step 7 — Start the Frontend

From the `client` folder in a separate terminal:

```bash
npm start
```

The React app will open automatically at `http://localhost:3000`.

---

### Step 8 — Run Tests

**Backend tests** from the `server` folder:

```bash
npm test
```

**Frontend tests** from the `client` folder:

```bash
npm test
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

---

## Notes
*This README covers Sprint 1 only.*
*It will be updated at each new sprint to reflect newly added features, any changes to setup, and updated project structure.*

*Last updated: Sprint 1 — March 2026*

---

## License

This project is licensed under the [MIT License](LICENSE).
