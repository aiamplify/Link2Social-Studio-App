/**
 * API endpoints for draft management
 * GET - List all drafts
 * POST - Create a new draft
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDrafts, createDraft } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method === 'GET') {
            const drafts = await getDrafts();
            return res.status(200).json(drafts);
        }

        if (req.method === 'POST') {
            const post = req.body;

            if (!post.title || !post.content) {
                return res.status(400).json({ error: 'Title and content are required' });
            }

            const draft = await createDraft(post);
            return res.status(201).json(draft);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        console.error('Drafts API error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
