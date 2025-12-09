-- Calendar Posts table for Social Media Content Calendar
-- Run this SQL in your Supabase SQL Editor to create the table for scheduling social media posts

CREATE TABLE IF NOT EXISTS calendar_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,                           -- The post text/caption
    platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'instagram')),
    scheduled_at TIMESTAMPTZ NOT NULL,               -- When to publish the post
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'posting', 'posted', 'failed')),
    post_type TEXT NOT NULL DEFAULT 'image' CHECK (post_type IN ('image', 'carousel', 'video', 'text')),
    images JSONB DEFAULT '[]',                       -- Array of base64 encoded images
    hashtags JSONB DEFAULT '[]',                     -- Array of hashtag strings
    source_type TEXT NOT NULL CHECK (source_type IN ('content_bundle', 'carousel', 'blog', 'thumbnail', 'manual')),
    source_id TEXT,                                  -- Reference to source content (optional)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    posted_at TIMESTAMPTZ,                           -- When the post was actually published
    post_url TEXT,                                   -- URL of the published post on the platform
    post_id TEXT,                                    -- Platform-specific post ID
    error_message TEXT,                              -- Error message if posting failed
    retry_count INTEGER NOT NULL DEFAULT 0           -- Number of retry attempts
);

-- Enable Row Level Security
ALTER TABLE calendar_posts ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (adjust for your auth setup)
CREATE POLICY "Allow all operations on calendar_posts" ON calendar_posts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_calendar_posts_scheduled_at
    ON calendar_posts(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_calendar_posts_status
    ON calendar_posts(status);

CREATE INDEX IF NOT EXISTS idx_calendar_posts_platform
    ON calendar_posts(platform);

CREATE INDEX IF NOT EXISTS idx_calendar_posts_status_scheduled
    ON calendar_posts(status, scheduled_at)
    WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_calendar_posts_updated_at
    ON calendar_posts(updated_at DESC);

-- Create a composite index for efficient range queries
CREATE INDEX IF NOT EXISTS idx_calendar_posts_date_range
    ON calendar_posts(scheduled_at, status, platform);

-- Add comment to the table
COMMENT ON TABLE calendar_posts IS 'Stores scheduled social media posts for the content calendar. Supports automatic posting via cron job.';

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS calendar_posts_updated_at_trigger ON calendar_posts;
CREATE TRIGGER calendar_posts_updated_at_trigger
    BEFORE UPDATE ON calendar_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_posts_updated_at();
