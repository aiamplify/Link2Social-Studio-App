/**
 * Blotato Status API Route
 *
 * Gets the status of a scheduled or posted item from Blotato.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Blotato API configuration
const BLOTATO_API_URL = process.env.BLOTATO_API_URL || 'https://api.blotato.com/v1';
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check for API key
    if (!BLOTATO_API_KEY) {
        console.error('Blotato API key not configured');
        return res.status(500).json({
            success: false,
            message: 'Blotato API key not configured. Please add BLOTATO_API_KEY to your environment variables.'
        });
    }

    try {
        const { scheduleId } = req.query;

        // Validate required fields
        if (!scheduleId || typeof scheduleId !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Schedule ID is required'
            });
        }

        console.log(`Getting Blotato status for: ${scheduleId}`);

        // Make request to Blotato API
        const response = await fetch(`${BLOTATO_API_URL}/schedule/${scheduleId}/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${BLOTATO_API_KEY}`,
                'Content-Type': 'application/json',
            }
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Blotato status error:', responseData);
            return res.status(response.status).json({
                success: false,
                message: responseData.message || responseData.error || 'Failed to get status',
                details: responseData
            });
        }

        return res.status(200).json({
            success: true,
            status: responseData.status,
            scheduledAt: responseData.scheduledTime,
            platformResults: responseData.results || responseData.platformResults
        });

    } catch (error: unknown) {
        console.error('Blotato status error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({
            success: false,
            message: `Status check failed: ${errorMessage}`
        });
    }
}
