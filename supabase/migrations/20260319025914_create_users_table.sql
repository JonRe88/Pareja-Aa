/*
  # Create users table

  1. New Tables
    - `users`
      - `user_id` (text, primary key) - Unique identifier for the user
      - `email` (text, unique, not null) - User's email address
      - `name` (text, not null) - User's display name
      - `picture` (text, nullable) - URL to user's profile picture
      - `created_at` (timestamptz) - Timestamp when user was created

  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read their own data
    - Add policy for users to update their own data
*/

CREATE TABLE IF NOT EXISTS users (
  user_id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  picture text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Allow anonymous read for users"
  ON users
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert for users"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);
