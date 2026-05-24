-- Optional live stream URL on election cycles so admins can surface a
-- "Watch live" CTA during AGMs / vote sessions.
ALTER TABLE "election_cycles"
  ADD COLUMN IF NOT EXISTS "live_stream_url" text;
