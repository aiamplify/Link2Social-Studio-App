/**
 * Blotato Status Sync - Cron Job Handler
 *
 * This serverless function runs periodically (via Vercel Cron) to:
 * 1. Check for posts that are scheduled via Blotato
 * 2. Get their current status from Blotato
 * 3. Update the local calendar with the status
 *
 * Note: Actual posting is handled by Blotato, not this cron job.
 * This cron just syncs status for display in the content calendar.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Blotato API configuration
const BLOTATO_API_URL = process.env.BLOTATO_API_URL || 'https://api.blotato.com/v1';
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY || '';

interface CalendarPost {
    id: string;
    title: string;
    content: string;
    platform: string;
    scheduled_at: string;
    status: string;
    images: string[];
    blotato_schedule_id?: string;
    retry_count: number;
}

interface BlotatoStatusResponse {
    success: boolean;
    status?: 'scheduled' | 'posting' | 'posted' | 'failed';
    platformResults?: {
        platform: string;
        status: string;
        postUrl?: string;
        postId?: string;
    }[];
    message?: string;
}

/**
 * Get the status of a scheduled post from Blotato
 */
async function getBlotatoStatus(scheduleId: string): Promise<BlotatoStatusResponse> {
    if (!BLOTATO_API_KEY) {
        return { success: false, message: 'Blotato API key not configured' };
    }

    try {
        const response = await fetch(`${BLOTATO_API_URL}/schedule/${scheduleId}/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${BLOTATO_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return { success: false, message: 'Failed to get Blotato status' };
        }

        const data = await response.json();
        return {
            success: true,
            status: data.status,
            platformResults: data.results || data.platformResults,
        };
    } catch (error) {
        console.error('Blotato status check error:', error);
        return { success: false, message: 'Error checking Blotato status' };
    }
}

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('Syncing scheduled posts status at:', new Date().toISOString());

    // Check if Blotato API key is configured
    if (!BLOTATO_API_KEY) {
        console.log('Blotato API key not configured - skipping sync');
        return res.status(200).json({
            message: 'Blotato API key not configured. Please add BLOTATO_API_KEY to environment variables.',
            processedAt: new Date().toISOString(),
        });
    }

    try {
        // Fetch posts that have a Blotato schedule ID and are still scheduled or posting
        const { data: pendingPosts, error: fetchError } = await supabase
            .from('calendar_posts')
            .select('*')
            .not('blotato_schedule_id', 'is', null)
            .in('status', ['scheduled', 'posting'])
            .order('scheduled_at', { ascending: true })
            .limit(50);

        if (fetchError) {
            console.error('Error fetching pending posts:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        if (!pendingPosts || pendingPosts.length === 0) {
            return res.status(200).json({
                message: 'No posts to sync',
                processedAt: new Date().toISOString(),
            });
        }

        console.log(`Found ${pendingPosts.length} posts to sync with Blotato`);

        const results: Array<{
            id: string;
            blotatoId: string;
            platform: string;
            previousStatus: string;
            newStatus: string;
            updated: boolean;
        }> = [];

        // Check status for each post
        for (const post of pendingPosts as CalendarPost[]) {
            if (!post.blotato_schedule_id) continue;

            console.log(`Checking status for post ${post.id} (Blotato: ${post.blotato_schedule_id})`);

            const statusResult = await getBlotatoStatus(post.blotato_schedule_id);

            if (!statusResult.success) {
                console.log(`Failed to get status for ${post.id}: ${statusResult.message}`);
                results.push({
                    id: post.id,
                    blotatoId: post.blotato_schedule_id,
                    platform: post.platform,
                    previousStatus: post.status,
                    newStatus: post.status,
                    updated: false,
                });
                continue;
            }

            // Check if status has changed
            if (statusResult.status && statusResult.status !== post.status) {
                // Find platform-specific result
                const platformResult = statusResult.platformResults?.find(
                    r => r.platform.toLowerCase() === post.platform.toLowerCase()
                );

                const updateData: Record<string, unknown> = {
                    status: statusResult.status,
                    updated_at: new Date().toISOString(),
                };

                if (statusResult.status === 'posted') {
                    updateData.posted_at = new Date().toISOString();
                    if (platformResult?.postUrl) {
                        updateData.post_url = platformResult.postUrl;
                    }
                    if (platformResult?.postId) {
                        updateData.post_id = platformResult.postId;
                    }
                }

                await supabase
                    .from('calendar_posts')
                    .update(updateData)
                    .eq('id', post.id);

                console.log(`Updated post ${post.id}: ${post.status} -> ${statusResult.status}`);

                results.push({
                    id: post.id,
                    blotatoId: post.blotato_schedule_id,
                    platform: post.platform,
                    previousStatus: post.status,
                    newStatus: statusResult.status,
                    updated: true,
                });
            } else {
                results.push({
                    id: post.id,
                    blotatoId: post.blotato_schedule_id,
                    platform: post.platform,
                    previousStatus: post.status,
                    newStatus: post.status,
                    updated: false,
                });
            }
        }

        const updatedCount = results.filter(r => r.updated).length;

        return res.status(200).json({
            message: `Synced ${pendingPosts.length} posts, updated ${updatedCount}`,
            processedAt: new Date().toISOString(),
            results,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Blotato sync error:', errorMessage);
        return res.status(500).json({ error: errorMessage });
    }
}
