/**
 * API endpoints for scheduled posts management
 * GET - List all scheduled posts
 * POST - Schedule a new post
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScheduledPosts, schedulePost } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method === 'GET') {
            const posts = await getScheduledPosts();
            return res.status(200).json(posts);
        }

        if (req.method === 'POST') {
            const { post, scheduledDate } = req.body;

            if (!post || !post.title || !post.content) {
                return res.status(400).json({ error: 'Post with title and content is required' });
            }

            if (!scheduledDate) {
                return res.status(400).json({ error: 'Scheduled date is required' });
            }

            const scheduled = await schedulePost(post, new Date(scheduledDate));
            return res.status(201).json(scheduled);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        console.error('Scheduled posts API error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
