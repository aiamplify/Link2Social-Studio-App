/**
 * Supabase client configuration
 * This connects directly to Supabase from the browser
 */

import { createClient } from '@supabase/supabase-js';

// These are public keys - safe to expose in client-side code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Draft/schedule features will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DbDraft {
    id: string;
    title: string;
    subtitle: string | null;
    metadata: string | null;
    content: string;
    visuals: any; // JSONB
    created_at: string;
    updated_at: string;
}

export interface DbScheduledPost {
    id: string;
    title: string;
    subtitle: string | null;
    metadata: string | null;
    content: string;
    visuals: any; // JSONB
    scheduled_date: string;
    created_at: string;
}

export interface DbPublishedPost {
    id: string;
    title: string;
    subtitle: string | null;
    metadata: string | null;
    content: string;
    visuals: any; // JSONB
    slug: string;
    publish_date: string;
    created_at: string;
}
