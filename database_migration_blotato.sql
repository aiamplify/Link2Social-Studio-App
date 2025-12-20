-- Database Migration for Blotato Integration
-- Run this SQL in your Supabase SQL Editor to update the database schema
-- This adds support for all 8 Blotato platforms and fixes any missing tables

-- ==================== UPDATE CALENDAR_POSTS FOR BLOTATO ====================

-- First, drop the old platform constraint and add new one with all 8 platforms
ALTER TABLE calendar_posts DROP CONSTRAINT IF EXISTS calendar_posts_platform_check;
ALTER TABLE calendar_posts ADD CONSTRAINT calendar_posts_platform_check
    CHECK (platform IN ('twitter', 'facebook', 'instagram', 'linkedin', 'bluesky', 'threads', 'tiktok', 'youtube'));

-- Add Blotato schedule ID column for tracking
ALTER TABLE calendar_posts ADD COLUMN IF NOT EXISTS blotato_schedule_id TEXT;

-- Create index for Blotato schedule ID
CREATE INDEX IF NOT EXISTS idx_calendar_posts_blotato_schedule_id
    ON calendar_posts(blotato_schedule_id)
    WHERE blotato_schedule_id IS NOT NULL;

-- ==================== CREATE DRAFTS TABLE ====================

CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    metadata TEXT,
    content TEXT NOT NULL,
    visuals JSONB DEFAULT '[]',        -- Array of {id, prompt, caption, imageData, status}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (adjust for your auth setup)
DROP POLICY IF EXISTS "Allow all operations on drafts" ON drafts;
CREATE POLICY "Allow all operations on drafts" ON drafts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_drafts_updated_at
    ON drafts(updated_at DESC);

-- Add comment to the table
COMMENT ON TABLE drafts IS 'Stores draft blog posts from the Blog Remix tool';

-- ==================== CREATE SCHEDULED_POSTS TABLE ====================

CREATE TABLE IF NOT EXISTS scheduled_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    metadata TEXT,
    content TEXT NOT NULL,
    visuals JSONB DEFAULT '[]',
    scheduled_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
DROP POLICY IF EXISTS "Allow all operations on scheduled_posts" ON scheduled_posts;
CREATE POLICY "Allow all operations on scheduled_posts" ON scheduled_posts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_date
    ON scheduled_posts(scheduled_date);

-- Add comment
COMMENT ON TABLE scheduled_posts IS 'Stores scheduled blog posts that will be auto-published';

-- ==================== CREATE PUBLISHED_POSTS TABLE ====================

CREATE TABLE IF NOT EXISTS published_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    metadata TEXT,
    content TEXT NOT NULL,
    visuals JSONB DEFAULT '[]',
    slug TEXT UNIQUE NOT NULL,
    publish_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE published_posts ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
DROP POLICY IF EXISTS "Allow all operations on published_posts" ON published_posts;
CREATE POLICY "Allow all operations on published_posts" ON published_posts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_published_posts_slug
    ON published_posts(slug);

CREATE INDEX IF NOT EXISTS idx_published_posts_publish_date
    ON published_posts(publish_date DESC);

-- Add comment
COMMENT ON TABLE published_posts IS 'Stores published blog posts';

-- ==================== CREATE CAROUSEL_DRAFTS TABLE ====================

CREATE TABLE IF NOT EXISTS carousel_drafts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slides JSONB DEFAULT '[]',          -- Array of {order, title, content, imageData}
    caption TEXT,
    captions JSONB DEFAULT '[]',        -- Array of {platform, content} for multi-platform
    platforms JSONB DEFAULT '[]',       -- Target platforms
    source_input TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE carousel_drafts ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
DROP POLICY IF EXISTS "Allow all operations on carousel_drafts" ON carousel_drafts;
CREATE POLICY "Allow all operations on carousel_drafts" ON carousel_drafts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_carousel_drafts_updated_at
    ON carousel_drafts(updated_at DESC);

-- Add comment
COMMENT ON TABLE carousel_drafts IS 'Stores carousel drafts from the Carousel Generator tool';

-- ==================== AUTO-UPDATE TRIGGERS ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for drafts
DROP TRIGGER IF EXISTS drafts_updated_at_trigger ON drafts;
CREATE TRIGGER drafts_updated_at_trigger
    BEFORE UPDATE ON drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for content_bundle_drafts
DROP TRIGGER IF EXISTS content_bundle_drafts_updated_at_trigger ON content_bundle_drafts;
CREATE TRIGGER content_bundle_drafts_updated_at_trigger
    BEFORE UPDATE ON content_bundle_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for carousel_drafts
DROP TRIGGER IF EXISTS carousel_drafts_updated_at_trigger ON carousel_drafts;
CREATE TRIGGER carousel_drafts_updated_at_trigger
    BEFORE UPDATE ON carousel_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==================== DONE ====================

-- Summary of changes:
-- 1. Updated calendar_posts to support all 8 Blotato platforms
-- 2. Added blotato_schedule_id column for tracking scheduled posts
-- 3. Created drafts table for blog post drafts
-- 4. Created scheduled_posts table for scheduled blog posts
-- 5. Created published_posts table for published blog posts
-- 6. Created carousel_drafts table for carousel drafts
-- 7. Added auto-update triggers for updated_at columns

SELECT 'Migration complete! All tables are ready for Blotato integration.' as status;
