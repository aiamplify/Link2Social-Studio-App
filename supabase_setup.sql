-- Content Bundle Drafts table
-- Run this SQL in your Supabase SQL Editor to create the table for saving content bundles

CREATE TABLE IF NOT EXISTS content_bundle_drafts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    image_data TEXT,                     -- Base64 encoded PNG (can be large)
    citations JSONB DEFAULT '[]',        -- Array of {uri: string, title: string}
    social_posts JSONB DEFAULT '[]',     -- Array of {platform: string, content: string}
    source_input TEXT NOT NULL,          -- Original URL or topic text
    input_mode TEXT NOT NULL,            -- 'url', 'prompt', or 'upload'
    style TEXT NOT NULL,                 -- Style preset name
    platforms JSONB DEFAULT '[]',        -- Array of platform strings
    language TEXT NOT NULL DEFAULT 'English',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE content_bundle_drafts ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (adjust as needed for your auth setup)
-- This allows all operations for now - modify based on your authentication needs
CREATE POLICY "Allow all operations on content_bundle_drafts" ON content_bundle_drafts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_bundle_drafts_updated_at
    ON content_bundle_drafts(updated_at DESC);

-- Add comment to the table
COMMENT ON TABLE content_bundle_drafts IS 'Stores saved content bundles from the Content Bundle Creator tool';
