/**
 * Cron job to automatically publish scheduled posts
 * This endpoint is called by Vercel Cron every 5 minutes
 * It checks for any scheduled posts that are due and publishes them
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPostsDueForPublishing, publishScheduledPost } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Verify this is a cron request (Vercel adds this header)
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the cron secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Get all posts due for publishing
        const duePosts = await getPostsDueForPublishing();

        if (duePosts.length === 0) {
            return res.status(200).json({
                message: 'No posts due for publishing',
                checked_at: new Date().toISOString()
            });
        }

        // Publish each due post
        const results = [];
        for (const post of duePosts) {
            try {
                const published = await publishScheduledPost(post.id);
                results.push({
                    id: post.id,
                    title: post.title,
                    status: 'published',
                    publishedAt: new Date().toISOString()
                });
                console.log(`Published scheduled post: ${post.title}`);
            } catch (error: any) {
                results.push({
                    id: post.id,
                    title: post.title,
                    status: 'failed',
                    error: error.message
                });
                console.error(`Failed to publish post ${post.id}:`, error);
            }
        }

        return res.status(200).json({
            message: `Processed ${duePosts.length} scheduled posts`,
            results,
            executed_at: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Cron job error:', error);
        return res.status(500).json({ error: 'Cron job failed', details: error.message });
    }
}
