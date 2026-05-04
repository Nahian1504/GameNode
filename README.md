# GameNode — Intelligent Gaming Dashboard

> A centralized AI-powered gaming dashboard that connects to your Steam account to track your game library, achievements, favorites, and leaderboards — with personalized AI recommendations and a gaming assistant.

---

## 🎮 Demo

[▶ (https://drive.google.com/file/d/11oT6y49XxSo-fiPHUjytIkmRMNQ-81NW/view?usp=sharing)

---

## ✨ Features

- **Game Library** — Paginated Steam library with sort by playtime, name, or recently played. Search and filter your games instantly.
- **Achievements** — Per-game achievement tracking with progress bars, rarity indicators, and unlocked vs locked filters.
- **Favorites** — Persistent favorites list linked to your account and enriched with playtime data.
- **Leaderboard** — Create, edit, and delete custom score entries. Sort by game, export to CSV, and share a public link.
- **AI Complaint System** — Submit issues and receive instant AI-generated resolution suggestions. Mark resolved or escalate.
- **AI Recommendations** — Personalized game recommendations based on your playtime, achievements, and favorites. Cached for 24 hours.
- **AI Gaming Assistant** — Chat with an AI assistant that uses your actual Steam library as context for personalized answers.

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Database and object modeling |
| JWT + bcryptjs | Authentication and password hashing |
| Groq API (LLaMA 3) | AI recommendations, assistant, and complaint resolution |
| Steam Web API | Game library, achievements, news, and player counts |
| express-rate-limit | API rate limiting |
| express-validator | Input validation and sanitization |
| Docker | Containerization |
| GitHub Actions | CI/CD pipeline |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI component library |
| React Router DOM | Client-side routing |
| Context API | Global state management |
| Formik + Yup | Form handling and validation |
| Axios | HTTP client |

### Testing
| Technology | Purpose |
|-----------|---------|
| Jest + Supertest | Backend API and unit testing |
| React Testing Library | Frontend component testing |

---

## 📁 Project Structure

```
gamenode/
├── .github/
│   └── workflows/
│       └── ci.yml
├── server/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── assistantValidation.js
│   │   ├── complaintValidation.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── models/
│   │   ├── Achievement.js
│   │   ├── Complaint.js
│   │   ├── ErrorLog.js
│   │   ├── Favorite.js
│   │   ├── Game.js
│   │   ├── Leaderboard.js
│   │   ├── NewsCache.js
│   │   ├── Recommendation.js
│   │   └── User.js
│   ├── routes/
│   │   ├── achievementRoutes.js
│   │   ├── assistantRoutes.js
│   │   ├── authRoutes.js
│   │   ├── complaintRoutes.js
│   │   ├── favoritesRoutes.js
│   │   ├── leaderboardRoutes.js
│   │   ├── newsRoutes.js
│   │   ├── publicLeaderboardRoutes.js
│   │   ├── recommendationRoutes.js
│   │   └── steamRoutes.js
│   ├── tests/
│   │   ├── achievements/
│   │   ├── aiAssistant/
│   │   ├── complaint/
│   │   ├── dashboard/
│   │   ├── errorMessage/
│   │   ├── favorites/
│   │   ├── leaderboard/
│   │   ├── news-PlayerCount/
│   │   ├── recommendations/
│   │   └── auth.test.js
│   ├── utils/
│   │   ├── assistantContext.js
│   │   ├── favoritesEnrichment.js
│   │   ├── genAIService.js
│   │   ├── passwordUtils.js
│   │   ├── steamService.js
│   │   └── tokenUtils.js
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile
│   ├── index.js
│   └── package.json
├── client/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   ├── AI/
│       │   │   └── AssistantChat.jsx
│       │   ├── GameCard/
│       │   │   └── GameCard.jsx
│       │   ├── Layout/
│       │   │   └── Navbar.jsx
│       │   └── ProtectedRoute/
│       │       └── ProtectedRoute.jsx
│       ├── constants/
│       │   └── complaint.js
│       ├── pages/
│       │   ├── Achievements/
│       │   ├── Auth/
│       │   ├── Complaint/
│       │   ├── Dashboard/
│       │   ├── Favorites/
│       │   ├── Leaderboard/
│       │   ├── Recommendations/
│       │   └── Steam/
│       ├── services/
│       │   └── axiosConfig.js
│       ├── store/
│       │   ├── auth/
│       │   └── dashboard/
│       ├── styles/
│       │   └── global.css
│       ├── tests/
│       └── App.js
├── docker-compose.yml
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Download |
|------|---------|---------|
| Node.js | v18 or higher | https://nodejs.org |
| MongoDB | v6 or higher | https://www.mongodb.com/try/download/community |
| Git | Latest | https://git-scm.com |
| Docker (optional) | Latest | https://www.docker.com |

You will also need:
- A free **Steam Web API key** — get one at https://steamcommunity.com/dev/apikey
- A free **Groq API key** — get one at https://console.groq.com

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Nahian1504/GameNode.git
cd GameNode
```

---

### Step 2 — Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend** (in a new terminal):
```bash
cd client
npm install
```

---

### Step 3 — Configure Environment Variables

Copy the example file and fill in your values:

```bash
cd server
cp .env.example .env
```

Open `server/.env` and fill in:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

MONGODB_URI=mongodb://localhost:27017/gamenode
MONGODB_URI_TEST=mongodb://localhost:27017/gamenode_test

JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=24h

STEAM_API_KEY=your_steam_api_key_here
GROQ_API_KEY=your_groq_api_key_here

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=700
AUTH_RATE_LIMIT_MAX=70
STEAM_RATE_LIMIT_MAX=300
DASHBOARD_RATE_LIMIT_MAX=300
LEADERBOARD_RATE_LIMIT_MAX=300
NEWS_RATE_LIMIT_MAX=300
PLAYER_COUNT_RATE_LIMIT_MAX=300
RECOMMENDATION_RATE_LIMIT_MAX=50
ASSISTANT_RATE_LIMIT_MAX=100
```

---

### Step 4 — Start MongoDB

```bash
mongod
```

Leave this terminal open.

---

### Step 5 — Start the Backend

```bash
cd server
npm run dev
```

You should see:
```
🎮 GameNode API running on port 5000
   Environment: development
   Health check: http://localhost:5000/api/health

MongoDB Connected: localhost
```

---

### Step 6 — Start the Frontend

```bash
cd client
npm start
```

The app will open at `http://localhost:3000`.

---

## 🐳 Running with Docker

Run the full stack with one command:

```bash
docker-compose up
```

Or pull and run just the server:

```bash
docker pull nahian1504/gamenode-server:latest

docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=your_mongodb_uri \
  -e JWT_SECRET=your_jwt_secret \
  -e GROQ_API_KEY=your_groq_key \
  -e STEAM_API_KEY=your_steam_key \
  nahian1504/gamenode-server:latest
```

**DockerHub:** https://hub.docker.com/r/nahian1504/gamenode-server

---

## 🧪 Running Tests

**Backend tests:**
```bash
cd server
npm test
```

**Run a specific feature:**
```bash
npm run test:achievements
npm run test:complaint
npm run test:recommendations
npm run test:assistant
npm run test:leaderboard
npm run test:favorites
npm run test:dashboard
npm run test:error
npm run test:auth
```

**Frontend tests:**
```bash
cd client
npm test
```

---

## 🔌 API Endpoints

All protected endpoints require: `Authorization: Bearer <token>`

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
| DELETE | `/api/steam/disconnect` | Yes | Unlink Steam and clear all data |
| GET | `/api/steam/dashboard` | Yes | Get paginated game library |
| GET | `/api/steam/playercount/:appId` | Yes | Get current player count |
| GET | `/api/steam/news/:appId` | Yes | Get recent game news |

### Achievements
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/achievements/:appId` | Yes | Fetch and save achievements for a game |
| GET | `/api/achievements/:appId/cached` | Yes | Return cached achievements |

### Favorites
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/favorites` | Yes | Get all favorites |
| POST | `/api/favorites/:appId` | Yes | Add a game to favorites |
| DELETE | `/api/favorites/:appId` | Yes | Remove a game from favorites |

### Leaderboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/leaderboard` | Yes | Get user leaderboard entries |
| POST | `/api/leaderboard` | Yes | Create a new entry |
| PUT | `/api/leaderboard/:id` | Yes | Update an entry |
| DELETE | `/api/leaderboard/:id` | Yes | Delete an entry |
| GET | `/api/leaderboard/public/:userId` | No | View public leaderboard |

### AI Features
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/complaints` | Yes | Submit complaint and get AI resolution |
| GET | `/api/complaints/mine` | Yes | View complaint history |
| POST | `/api/recommendations` | Yes | Generate AI game recommendations |
| GET | `/api/recommendations/cached` | Yes | Return cached recommendations |
| POST | `/api/assistant` | Yes | Send message to AI assistant |

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Check server status |

---

## 🗄 Database Schemas

| Schema | Description |
|--------|-------------|
| User | Account with username, email, password hash, Steam ID, and role |
| UserGame | Steam game linked to user with playtime and metadata |
| Achievement | Per-game achievement data with unlock status and rarity |
| Favorite | User's favorited games list |
| Leaderboard | Custom score entries per user per game |
| Complaint | User complaint with AI resolution and status |
| Recommendation | Cached AI game recommendations per user (24h expiry) |
| ErrorLog | Persistent error logging with route, method, and timestamp |
| NewsCache | Cached Steam game news |

---

## ⚙️ CI/CD Pipeline

Every push to any branch and every pull request to `main` automatically runs:

- **Backend tests** — Jest with a MongoDB service container
- **Frontend tests** — React Testing Library with `CI=true`
- **Gate job** — Blocks PR merge if either job fails

Pipeline configuration: `.github/workflows/ci.yml`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
