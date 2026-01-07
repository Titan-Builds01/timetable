# Timetable Allocator

A comprehensive timetable allocation system with course matching, scheduling engine, and full-stack web interface.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)

## Project Structure

```
attendance/
├── frontend/          # Next.js application
├── backend/           # Express API server
└── shared/            # Shared TypeScript types
```

## Phase 1 Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Supabase project URL and service role key

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

4. Run database migrations:
   - Open Supabase Dashboard → SQL Editor
   - Run migrations in order:
     - `migrations/001_initial_schema.sql`
     - `migrations/002_indexes.sql`
     - `migrations/003_seed_timeslots.sql`

5. Seed admin user:
```bash
# Set environment variables
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD=admin123
export ADMIN_NAME="Admin User"

# Run seed script
npx ts-node scripts/seed-admin.ts
```

6. Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Endpoints (Phase 1)

### Health Check
- `GET /api/v1/health` - Health check endpoint

### Authentication
- `POST /api/v1/auth/login` - Login with email and password
- `GET /api/v1/auth/me` - Get current user (requires authentication)

## Database Schema

The database includes the following main tables:
- `users` - User accounts and roles
- `sessions` - Academic sessions/semesters
- `timeslots` - Time slot definitions
- `course_offerings` - Imported course offerings
- `canonical_courses` - Canonical course identities
- `course_aliases` - Course matching aliases
- `lecturers` - Lecturer information
- `rooms` - Room/venue information
- `blocked_times` - Blocked time slots
- `events` - Schedulable events
- `schedule_runs` - Timetable generation runs
- `scheduled_events` - Actual timetable placements
- `locks` - Locked placements
- `unscheduled_events` - Failed placements with reasons

See `backend/migrations/001_initial_schema.sql` for complete schema.

## Development

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server

## Next Steps

Phase 1 includes:
- ✅ Project setup
- ✅ Database schema and migrations
- ✅ JWT authentication
- ✅ Basic API structure
- ✅ Shared types

Upcoming phases:
- Phase 2: Sessions, timeslots, blocked times CRUD
- Phase 3: Data import and CRUD operations
- Phase 4: Course matching engine
- Phase 5: Event expansion
- Phase 6: Scheduling engine
- Phase 7: Locks and regeneration
- Phase 8: Exports and polish

