-- Migration 002: Performance Indexes
-- Creates indexes for query optimization

-- Course offerings indexes
CREATE INDEX IF NOT EXISTS idx_offerings_session ON course_offerings(session_id);
CREATE INDEX IF NOT EXISTS idx_offerings_match_status ON course_offerings(match_status);
CREATE INDEX IF NOT EXISTS idx_offerings_canonical ON course_offerings(canonical_course_id);
CREATE INDEX IF NOT EXISTS idx_offerings_normalized_title ON course_offerings(normalized_title);
CREATE INDEX IF NOT EXISTS idx_offerings_normalized_code ON course_offerings(normalized_code);

-- Canonical courses indexes
CREATE INDEX IF NOT EXISTS idx_canonical_normalized_title ON canonical_courses(normalized_title);

-- Course aliases indexes
CREATE INDEX IF NOT EXISTS idx_aliases_canonical ON course_aliases(canonical_course_id);
CREATE INDEX IF NOT EXISTS idx_aliases_normalized_title ON course_aliases(normalized_title);
CREATE INDEX IF NOT EXISTS idx_aliases_normalized_code ON course_aliases(normalized_code);

-- Matching suggestions indexes
CREATE INDEX IF NOT EXISTS idx_suggestions_offering ON matching_suggestions(offering_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_canonical ON matching_suggestions(canonical_course_id);

-- Lecturer assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_offering ON lecturer_assignments(offering_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lecturer ON lecturer_assignments(lecturer_id);

-- Blocked times indexes
CREATE INDEX IF NOT EXISTS idx_blocked_times_session_scope ON blocked_times(session_id, scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_blocked_times_day_slot ON blocked_times(day, timeslot_id);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_offering ON events(offering_id);
CREATE INDEX IF NOT EXISTS idx_events_lecturer ON events(lecturer_id);

-- Scheduled events indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_events_run ON scheduled_events(run_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_events_event ON scheduled_events(event_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_events_day_slot ON scheduled_events(day, timeslot_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_events_room ON scheduled_events(room_id);

-- Unique index for placement conflicts
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_events_unique_placement 
  ON scheduled_events(run_id, day, timeslot_id, room_id);

-- Locks indexes
CREATE INDEX IF NOT EXISTS idx_locks_session_event ON locks(session_id, event_id);
CREATE INDEX IF NOT EXISTS idx_locks_day_slot ON locks(day, timeslot_id);

-- Unscheduled events indexes
CREATE INDEX IF NOT EXISTS idx_unscheduled_events_run ON unscheduled_events(run_id);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active) WHERE is_active = TRUE;

-- Timeslots indexes
CREATE INDEX IF NOT EXISTS idx_timeslots_session ON timeslots(session_id);

-- Lecturers indexes
CREATE INDEX IF NOT EXISTS idx_lecturers_session ON lecturers(session_id);

-- Rooms indexes
CREATE INDEX IF NOT EXISTS idx_rooms_session ON rooms(session_id);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type);

