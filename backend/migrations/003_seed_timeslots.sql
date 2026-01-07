-- Migration 003: Seed Time Slots Function
-- Function to seed default timeslots for a session (300-level demo slots)

CREATE OR REPLACE FUNCTION seed_default_timeslots(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
  ts1_id UUID := gen_random_uuid();
  ts2_id UUID := gen_random_uuid();
  ts3_id UUID := gen_random_uuid();
  ts4_id UUID := gen_random_uuid();
  ts5_id UUID := gen_random_uuid();
  ts6_id UUID := gen_random_uuid();
  ts7_id UUID := gen_random_uuid();
  ts8_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO timeslots (id, session_id, label, start_time, end_time, sort_order) VALUES
    (ts1_id, p_session_id, '08:00-09:00', '08:00', '09:00', 1),
    (ts2_id, p_session_id, '09:00-09:30', '09:00', '09:30', 2),
    (ts3_id, p_session_id, '09:30-10:30', '09:30', '10:30', 3),
    (ts4_id, p_session_id, '10:30-11:30', '10:30', '11:30', 4),
    (ts5_id, p_session_id, '11:30-12:30', '11:30', '12:30', 5),
    (ts6_id, p_session_id, '12:30-13:30', '12:30', '13:30', 6),
    (ts7_id, p_session_id, '13:30-14:30', '13:30', '14:30', 7),
    (ts8_id, p_session_id, '14:30-16:30', '14:30', '16:30', 8);
END;
$$ LANGUAGE plpgsql;

-- Function to seed default blocked times (Sport and Jumat for 300 level)
-- Note: This requires the timeslots to exist first
CREATE OR REPLACE FUNCTION seed_default_blocked_times(
  p_session_id UUID,
  p_level INT DEFAULT 300
)
RETURNS VOID AS $$
DECLARE
  ts8_id UUID;
BEGIN
  -- Get TS8 timeslot ID
  SELECT id INTO ts8_id
  FROM timeslots
  WHERE session_id = p_session_id AND sort_order = 8
  LIMIT 1;
  
  IF ts8_id IS NULL THEN
    RAISE EXCEPTION 'TS8 timeslot not found for session %', p_session_id;
  END IF;
  
  -- Insert Sport block (Thursday TS8)
  INSERT INTO blocked_times (id, session_id, scope, scope_id, day, timeslot_id, reason)
  VALUES (
    gen_random_uuid(),
    p_session_id,
    'level',
    p_level::TEXT,
    'THU',
    ts8_id,
    'SPORT (300 level)'
  )
  ON CONFLICT DO NOTHING;
  
  -- Insert Jumat block (Friday TS8)
  INSERT INTO blocked_times (id, session_id, scope, scope_id, day, timeslot_id, reason)
  VALUES (
    gen_random_uuid(),
    p_session_id,
    'level',
    p_level::TEXT,
    'FRI',
    ts8_id,
    'JUMAT (300 level)'
  )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

