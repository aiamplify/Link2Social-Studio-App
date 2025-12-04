/**
 * API endpoints for individual published post operations
 * GET - Get a specific published post (by ID or slug)
 * DELETE - Delete a published post
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPublishedPost, deletePublishedPost } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Post ID or slug is required' });
    }

    try {
        if (req.method === 'GET') {
            const post = await getPublishedPost(id);
            if (!post) {
                return res.status(404).json({ error: 'Published post not found' });
            }
            return res.status(200).json(post);
        }

        if (req.method === 'DELETE') {
            const deleted = await deletePublishedPost(id);
            if (!deleted) {
                return res.status(404).json({ error: 'Published post not found' });
            }
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        console.error('Published post API error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
