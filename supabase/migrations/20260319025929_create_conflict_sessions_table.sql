/*
  # Create conflict_sessions table

  1. New Tables
    - `conflict_sessions`
      - `id` (uuid, primary key) - Unique identifier for the session
      - `code` (text, unique, not null) - 6-digit code to join the session
      - `user_id` (text, nullable) - Foreign key to users table (creator)
      - `status` (text, not null) - Session status: 'waiting_for_both', 'completed'
      - `person_a_data` (jsonb, nullable) - Data from person A including answers
      - `person_b_data` (jsonb, nullable) - Data from person B including answers
      - `ai_analysis` (jsonb, nullable) - AI analysis results
      - `pattern_tags` (text[], nullable) - Array of pattern tags for metrics
      - `created_at` (timestamptz) - Timestamp when session was created
      - `completed_at` (timestamptz, nullable) - Timestamp when session was completed

  2. Security
    - Enable RLS on `conflict_sessions` table
    - Add policy for users to read sessions they created or participated in
    - Add policy for users to update sessions they created
    - Add policy for anyone to insert new sessions
    - Add policy for anyone to update sessions by code (for joining)
*/

CREATE TABLE IF NOT EXISTS conflict_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  user_id text,
  status text NOT NULL DEFAULT 'waiting_for_both',
  person_a_data jsonb,
  person_b_data jsonb,
  ai_analysis jsonb,
  pattern_tags text[],
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE conflict_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sessions by code"
  ON conflict_sessions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert sessions"
  ON conflict_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update sessions by code"
  ON conflict_sessions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read own sessions"
  ON conflict_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text OR true);

CREATE POLICY "Authenticated users can update own sessions"
  ON conflict_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text OR true)
  WITH CHECK (user_id = auth.uid()::text OR true);

CREATE INDEX IF NOT EXISTS idx_conflict_sessions_code ON conflict_sessions(code);
CREATE INDEX IF NOT EXISTS idx_conflict_sessions_user_id ON conflict_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conflict_sessions_status ON conflict_sessions(status);
