# LINE Travel Bot

A conversational travel planning system built on LINE Bot, with AI-powered recommendations and an admin dashboard.

## Project Links

### 🌐 Live Demo
- **URL**: [https://wp1141-mrbm.vercel.app](https://wp1141-mrbm.vercel.app)
  - Project overview and admin dashboard entry

### 🤖 LINE Bot
- **LINE Friend**: [@083lhmmz](https://line.me/R/ti/p/@083lhmmz)

---

## Overview

LINE Travel Bot is an intelligent travel planning assistant. It collects user preferences (destination, duration, budget, theme, month) through the LINE chat interface and provides personalized travel recommendations. It also includes a full admin dashboard for viewing conversation history, analytics, and managing user interactions.

## Features

### 🤖 LINE Bot
- **Conversational data collection**: Gathers travel preferences through natural dialogue
- **State management**: Tracks conversation flow (country, days, budget, theme, month)
- **Smart recommendations**: Generates travel plans based on user preferences
- **Conversation history**: Persists all user–bot interactions

### 📊 Admin Dashboard
- **Google OAuth login**: Secure access control
- **Conversation list**: View all user conversations
- **Conversation details**: Full chat content, preferences, and recommendations
- **Search & filter**: Filter by user ID or conversation state
- **Analytics**:
  - Popular destinations
  - Conversation state distribution
  - Planning completion rate

## Tech Stack

- **Frontend**: Next.js 16 (App Router)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Auth**: NextAuth.js (Google OAuth)
- **Styling**: Tailwind CSS
- **LINE Bot SDK**: @line/bot-sdk
- **Language**: TypeScript

## Project Structure

```
hw6/line-travel-bot/
├── app/
│   ├── admin/              # Admin pages
│   │   ├── page.tsx        # Dashboard
│   │   ├── conversations/  # Conversation list & details
│   │   └── analytics/      # Analytics
│   ├── api/
│   │   ├── auth/           # NextAuth
│   │   └── webhook/        # LINE Bot Webhook
│   └── login/              # Login page
├── lib/
│   ├── prisma.ts           # Prisma Client
│   ├── line-bot.ts         # LINE Bot Client
│   ├── conversation-state.ts # Conversation state
│   ├── gemini.ts           # Gemini AI integration
│   └── llm-prompts.ts      # LLM prompt templates
└── prisma/
    └── schema.prisma       # Database schema
```

## Getting Started

### Prerequisites

- Node.js 18.x or later
- Yarn or npm
- PostgreSQL (e.g. [Neon](https://neon.tech/))

### Setup

1. **Clone and enter the project**:
   ```bash
   cd hw6/line-travel-bot
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   ```

3. **Environment variables**: Create a `.env` file in the project root (see below).

4. **Initialize the database**:
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start the dev server**:
   ```bash
   yarn dev
   ```

6. **Open the app**:
   - Frontend: http://localhost:3000
   - Admin: http://localhost:3000/admin

## Environment Variables

### Required

```bash
# Database
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-string  # e.g. `openssl rand -base64 32`

# Google OAuth (admin login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Optional (LINE Bot & LLM)

```bash
# LINE Bot (omit if you don’t need the bot)
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret

# Google Generative AI (Gemini) – for smart itinerary generation and NLU
# If unset, the bot uses rule-based flow only (no NLU or generated itineraries)
GEMINI_API_KEY=your-gemini-api-key
```

> **Note**:
> - The admin dashboard works without LINE Bot env vars. Set them only if you want the LINE bot.
> - Without `GEMINI_API_KEY`, the bot still runs but uses rule-based flow only (no natural language like “I want to go to Japan for 5 days” or detailed itineraries). Set it for full AI features.

**Get a Gemini API Key**:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key

## Scripts

```bash
# Dev server
yarn dev

# Production build
yarn build

# Production server
yarn start

# Lint
yarn lint

# Prisma Studio (DB UI)
npx prisma studio
```

## Deployment

### Deploy to Vercel

1. Push the repo to GitHub
2. Create a new project on [Vercel](https://vercel.com/)
3. Configure environment variables
4. Deploy

## AI Features

This project uses **Google Gemini API** for:

### Natural language understanding
- **Extraction**: Parses travel preferences from free-form input
  - e.g. “I want to go to Japan for 5 days” → `country: "日本"`, `days: "5天"`
  - e.g. “Plan a beach trip in March” → `month: "3月"`, `themes: "海島"`

### Itinerary generation
- **AI itineraries**: Daily plans with attractions, timing, and food suggestions
  - Google Maps links
  - Travel tips

### Input validation
- **Format checks**: Validates user input
- **Guidance**: Clear examples when format is invalid

### Implementation
- **Models**: `gemini-2.0-flash-exp` (primary), `gemini-1.5-pro` (fallback)
- **Prompt engineering**: Structured prompts for consistent output
- **Reliability**: Retries and timeouts

> **Note**: Without `GEMINI_API_KEY`, the bot runs in rule-based mode only (no NLU or generated itineraries).

## License

Course project.
