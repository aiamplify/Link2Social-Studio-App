/**
 * API endpoints for individual scheduled post operations
 * GET - Get a specific scheduled post
 * PUT - Update a scheduled post (including reschedule)
 * DELETE - Delete a scheduled post
 * POST - Actions: publish now, move to draft
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScheduledPost, updateScheduledPost, deleteScheduledPost, publishScheduledPost, moveToDraft } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Scheduled post ID is required' });
    }

    try {
        if (req.method === 'GET') {
            const post = await getScheduledPost(id);
            if (!post) {
                return res.status(404).json({ error: 'Scheduled post not found' });
            }
            return res.status(200).json(post);
        }

        if (req.method === 'PUT') {
            const { scheduledDate, post } = req.body;
            const updated = await updateScheduledPost(id, {
                scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
                post
            });
            if (!updated) {
                return res.status(404).json({ error: 'Scheduled post not found' });
            }
            return res.status(200).json(updated);
        }

        if (req.method === 'DELETE') {
            const deleted = await deleteScheduledPost(id);
            if (!deleted) {
                return res.status(404).json({ error: 'Scheduled post not found' });
            }
            return res.status(200).json({ success: true });
        }

        // Handle special actions via POST
        if (req.method === 'POST') {
            const { action } = req.body;

            if (action === 'publish') {
                const published = await publishScheduledPost(id);
                if (!published) {
                    return res.status(404).json({ error: 'Scheduled post not found' });
                }
                return res.status(200).json(published);
            }

            if (action === 'to_draft') {
                const draft = await moveToDraft(id);
                if (!draft) {
                    return res.status(404).json({ error: 'Scheduled post not found' });
                }
                return res.status(200).json(draft);
            }

            return res.status(400).json({ error: 'Invalid action' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        console.error('Scheduled post API error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
