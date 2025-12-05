/**
 * API endpoints for individual draft operations
 * GET - Get a specific draft
 * PUT - Update a draft
 * DELETE - Delete a draft
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDraft, updateDraft, deleteDraft, publishDraft, scheduleDraft } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Draft ID is required' });
    }

    try {
        if (req.method === 'GET') {
            const draft = await getDraft(id);
            if (!draft) {
                return res.status(404).json({ error: 'Draft not found' });
            }
            return res.status(200).json(draft);
        }

        if (req.method === 'PUT') {
            const updates = req.body;
            const draft = await updateDraft(id, updates);
            if (!draft) {
                return res.status(404).json({ error: 'Draft not found' });
            }
            return res.status(200).json(draft);
        }

        if (req.method === 'DELETE') {
            const deleted = await deleteDraft(id);
            if (!deleted) {
                return res.status(404).json({ error: 'Draft not found' });
            }
            return res.status(200).json({ success: true });
        }

        // Handle special actions via POST
        if (req.method === 'POST') {
            const { action, scheduledDate } = req.body;

            if (action === 'publish') {
                const published = await publishDraft(id);
                if (!published) {
                    return res.status(404).json({ error: 'Draft not found' });
                }
                return res.status(200).json(published);
            }

            if (action === 'schedule') {
                if (!scheduledDate) {
                    return res.status(400).json({ error: 'Scheduled date is required' });
                }
                const scheduled = await scheduleDraft(id, new Date(scheduledDate));
                if (!scheduled) {
                    return res.status(404).json({ error: 'Draft not found' });
                }
                return res.status(200).json(scheduled);
            }

            return res.status(400).json({ error: 'Invalid action' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        console.error('Draft API error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
