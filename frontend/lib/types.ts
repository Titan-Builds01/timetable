// User and Auth Types
export type UserRole = 'admin' | 'coordinator' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: Omit<User, 'password_hash'>;
}

// Session Types
export interface Session {
  id: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Time Slot Types
export interface TimeSlot {
  id: string;
  session_id: string;
  label: string;
  start_time: string;
  end_time: string;
  sort_order: number;
  created_at: string;
}

// Day Types
export type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';

// Course Types
export type CourseType = 'lecture' | 'lab' | 'tutorial';
export type MatchStatus = 'unresolved' | 'auto_matched' | 'needs_review' | 'manual_matched' | 'rejected';

export interface CanonicalCourse {
  id: string;
  canonical_title: string;
  normalized_title: string;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseOffering {
  id: string;
  session_id: string;
  course_code: string;
  normalized_code: string;
  original_title: string;
  normalized_title: string;
  level: number;
  credit_units: number;
  type: CourseType;
  department: string | null;
  match_status: MatchStatus;
  canonical_course_id: string | null;
  matched_by: string | null;
  matched_at: string | null;
  match_method: string | null;
  match_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface CourseAlias {
  id: string;
  canonical_course_id: string;
  course_code: string | null;
  normalized_code: string | null;
  original_title: string;
  normalized_title: string;
  source: 'auto' | 'manual_confirm';
  confidence: number;
  created_at: string;
}

// Blocked Time Types
export type BlockedTimeScope = 'global' | 'level' | 'lecturer' | 'room';

export interface BlockedTime {
  id: string;
  session_id: string;
  scope: BlockedTimeScope;
  scope_id: string | null;
  day: Day;
  timeslot_id: string;
  reason: string | null;
  created_at: string;
}

// Lecturer Types
export interface Lecturer {
  id: string;
  session_id: string;
  name: string;
  email: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface LecturerAssignment {
  id: string;
  session_id: string;
  offering_id: string;
  lecturer_id: string;
  share: number;
  created_at: string;
}

// Room Types
export type RoomType = 'lecture_room' | 'lab' | 'ict_room' | 'hall';

export interface Room {
  id: string;
  session_id: string;
  name: string;
  room_type: RoomType;
  capacity: number;
  location: string | null;
  created_at: string;
  updated_at: string;
}

// Event Types
export interface Event {
  id: string;
  session_id: string;
  offering_id: string;
  lecturer_id: string | null;
  event_index: number;
  duration_slots: number;
  room_type_required: RoomType;
  created_at: string;
}

// Schedule Run Types
export type RunStatus = 'running' | 'completed' | 'failed';

export interface ScheduleRun {
  id: string;
  session_id: string;
  seed: number | null;
  candidate_limit: number;
  optimization_iterations: number;
  scheduled_count: number;
  unscheduled_count: number;
  soft_score: number;
  status: RunStatus;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// Scheduled Event Types
export interface ScheduledEvent {
  id: string;
  run_id: string;
  event_id: string;
  day: Day;
  timeslot_id: string;
  second_timeslot_id: string | null;
  room_id: string;
  created_at: string;
}

// Unscheduled Event Types
export interface UnscheduledEvent {
  id: string;
  run_id: string;
  event_id: string;
  reason: string;
  created_at: string;
}

// Lock Types
export interface Lock {
  id: string;
  session_id: string;
  event_id: string;
  day: Day;
  timeslot_id: string;
  second_timeslot_id: string | null;
  room_id: string;
  created_by: string;
  created_at: string;
}

// Constraints Types
export interface ConstraintsConfig {
  slot_minutes_note?: string;
  allowed_days: Day[];
  consecutive_pairs: [string, string][];
  unit_mapping: {
    lecture: {
      [key: string]: Array<{ duration_slots: number; preferred_pair?: string[] }>;
    };
    lab: {
      default: Array<{ duration_slots: number; preferred_pair?: string[] }>;
    };
  };
  defaults: {
    max_sessions_per_lecturer_per_day: number;
    max_consecutive_sessions_per_lecturer: number;
    candidate_limit_per_event: number;
  };
  soft_weights: {
    spread_course_sessions: number;
    avoid_early: number;
    avoid_late: number;
    lecturer_overload: number;
    level_gaps: number;
    room_preference: number;
  };
}

// Export Types
export interface Export {
  id: string;
  run_id: string;
  format: 'pdf' | 'csv';
  file_path: string;
  created_by: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Role type for middleware
export type Role = 'admin' | 'coordinator' | 'viewer';

