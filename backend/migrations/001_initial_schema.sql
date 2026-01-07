-- Migration 001: Initial Schema
-- Creates all core tables for the timetable allocator system

-- Users and authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL CHECK (role IN ('admin', 'coordinator', 'viewer')),
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  starts_at DATE NULL,
  ends_at DATE NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Time slots (variable length)
CREATE TABLE IF NOT EXISTS timeslots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  label VARCHAR(40) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  sort_order INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, sort_order)
);

-- Canonical courses
CREATE TABLE IF NOT EXISTS canonical_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_title VARCHAR(200) NOT NULL,
  normalized_title VARCHAR(220) NOT NULL,
  department VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Course offerings
CREATE TABLE IF NOT EXISTS course_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  course_code VARCHAR(30) NOT NULL,
  normalized_code VARCHAR(30) NOT NULL,
  original_title VARCHAR(220) NOT NULL,
  normalized_title VARCHAR(220) NOT NULL,
  level INT NOT NULL CHECK (level > 0),
  credit_units INT NOT NULL CHECK (credit_units > 0),
  type VARCHAR(16) NOT NULL CHECK (type IN ('lecture', 'lab', 'tutorial')),
  department VARCHAR(80) NULL,
  match_status VARCHAR(16) NOT NULL DEFAULT 'unresolved' 
    CHECK (match_status IN ('unresolved', 'auto_matched', 'needs_review', 'manual_matched', 'rejected')),
  canonical_course_id UUID NULL REFERENCES canonical_courses(id) ON DELETE SET NULL,
  matched_by UUID NULL REFERENCES users(id),
  matched_at TIMESTAMP NULL,
  match_method VARCHAR(20) NULL,
  match_score DECIMAL(5,3) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Course aliases (memory for matching)
CREATE TABLE IF NOT EXISTS course_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_course_id UUID NOT NULL REFERENCES canonical_courses(id) ON DELETE CASCADE,
  course_code VARCHAR(30) NULL,
  normalized_code VARCHAR(30) NULL,
  original_title VARCHAR(220) NOT NULL,
  normalized_title VARCHAR(220) NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('auto', 'manual_confirm')),
  confidence DECIMAL(4,3) NOT NULL DEFAULT 1.000,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Matching suggestions (stored results)
CREATE TABLE IF NOT EXISTS matching_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  canonical_course_id UUID NOT NULL REFERENCES canonical_courses(id) ON DELETE CASCADE,
  score DECIMAL(5,3) NOT NULL,
  token_overlap TEXT NULL,
  method VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(offering_id, canonical_course_id)
);

-- Lecturers
CREATE TABLE IF NOT EXISTS lecturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NULL,
  department VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Lecturer assignments (many-to-many with share)
CREATE TABLE IF NOT EXISTS lecturer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  share DECIMAL(4,3) NOT NULL DEFAULT 1.000 CHECK (share > 0 AND share <= 1),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(offering_id, lecturer_id)
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('lecture_room', 'lab', 'ict_room', 'hall')),
  capacity INT NOT NULL CHECK (capacity > 0),
  location VARCHAR(200) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Blocked times (global/level/lecturer/room)
CREATE TABLE IF NOT EXISTS blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  scope VARCHAR(16) NOT NULL CHECK (scope IN ('global', 'level', 'lecturer', 'room')),
  scope_id UUID NULL, -- level (INT stored as text), lecturer_id, room_id, or NULL for global
  day VARCHAR(3) NOT NULL CHECK (day IN ('MON', 'TUE', 'WED', 'THU', 'FRI')),
  timeslot_id UUID NOT NULL REFERENCES timeslots(id) ON DELETE CASCADE,
  reason VARCHAR(200) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, scope, scope_id, day, timeslot_id)
);

-- Constraints (JSON config per session)
CREATE TABLE IF NOT EXISTS constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Events (expanded from offerings)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  offering_id UUID NOT NULL REFERENCES course_offerings(id) ON DELETE CASCADE,
  lecturer_id UUID NULL REFERENCES lecturers(id) ON DELETE SET NULL,
  event_index INT NOT NULL, -- 0, 1, 2... for multi-event offerings
  duration_slots INT NOT NULL DEFAULT 1 CHECK (duration_slots IN (1, 2)),
  room_type_required VARCHAR(20) NOT NULL CHECK (room_type_required IN ('lecture_room', 'lab', 'ict_room', 'hall')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(offering_id, event_index)
);

-- Schedule runs
CREATE TABLE IF NOT EXISTS schedule_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seed INT NULL,
  candidate_limit INT NOT NULL DEFAULT 25,
  optimization_iterations INT NOT NULL DEFAULT 0,
  scheduled_count INT NOT NULL DEFAULT 0,
  unscheduled_count INT NOT NULL DEFAULT 0,
  soft_score INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);

-- Scheduled events (placements)
CREATE TABLE IF NOT EXISTS scheduled_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES schedule_runs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  day VARCHAR(3) NOT NULL CHECK (day IN ('MON', 'TUE', 'WED', 'THU', 'FRI')),
  timeslot_id UUID NOT NULL REFERENCES timeslots(id),
  second_timeslot_id UUID NULL REFERENCES timeslots(id),
  room_id UUID NOT NULL REFERENCES rooms(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(run_id, event_id)
);

-- Add constraint for duration check
ALTER TABLE scheduled_events 
ADD CONSTRAINT check_duration 
CHECK (
  (second_timeslot_id IS NULL AND (SELECT duration_slots FROM events WHERE id = event_id) = 1) OR
  (second_timeslot_id IS NOT NULL AND (SELECT duration_slots FROM events WHERE id = event_id) = 2)
);

-- Locks (pinned placements)
CREATE TABLE IF NOT EXISTS locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  day VARCHAR(3) NOT NULL CHECK (day IN ('MON', 'TUE', 'WED', 'THU', 'FRI')),
  timeslot_id UUID NOT NULL REFERENCES timeslots(id),
  second_timeslot_id UUID NULL REFERENCES timeslots(id),
  room_id UUID NOT NULL REFERENCES rooms(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, event_id)
);

-- Unscheduled events (with reasons)
CREATE TABLE IF NOT EXISTS unscheduled_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES schedule_runs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reason VARCHAR(240) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Soft violations (optional for MVP+)
CREATE TABLE IF NOT EXISTS soft_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES schedule_runs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  violation_type VARCHAR(40) NOT NULL,
  penalty INT NOT NULL,
  details JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Exports (optional)
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES schedule_runs(id) ON DELETE CASCADE,
  format VARCHAR(10) NOT NULL CHECK (format IN ('pdf', 'csv')),
  file_path VARCHAR(500) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

