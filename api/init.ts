/**
 * API endpoint to initialize the database
 * Call this once to create all necessary tables
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeDatabase } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Allow both GET and POST for easier initialization
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await initializeDatabase();
        return res.status(200).json({ success: true, message: 'Database initialized successfully' });
    } catch (error: any) {
        console.error('Database initialization error:', error);
        return res.status(500).json({ error: 'Failed to initialize database', details: error.message });
    }
}
