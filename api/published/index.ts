/**
 * API endpoints for published posts
 * GET - List all published posts
 * POST - Publish a post immediately
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPublishedPosts, publishPost } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method === 'GET') {
            const posts = await getPublishedPosts();
            return res.status(200).json(posts);
        }

        if (req.method === 'POST') {
            const post = req.body;

            if (!post.title || !post.content) {
                return res.status(400).json({ error: 'Title and content are required' });
            }

            const published = await publishPost(post);
            return res.status(201).json(published);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        console.error('Published posts API error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
