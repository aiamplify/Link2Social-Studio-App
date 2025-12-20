/**
 * Blotato Cancel API Route
 *
 * Handles cancellation of scheduled posts via Blotato API.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Blotato API configuration
const BLOTATO_API_URL = process.env.BLOTATO_API_URL || 'https://api.blotato.com/v1';
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY || '';

interface CancelRequest {
    scheduleId: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST requests
    if (req.method !== 'POST') {
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
        const { scheduleId } = req.body as CancelRequest;

        // Validate required fields
        if (!scheduleId) {
            return res.status(400).json({
                success: false,
                message: 'Schedule ID is required'
            });
        }

        console.log(`Cancelling Blotato schedule: ${scheduleId}`);

        // Make request to Blotato API
        const response = await fetch(`${BLOTATO_API_URL}/schedule/${scheduleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${BLOTATO_API_KEY}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const responseData = await response.json();
            console.error('Blotato cancel error:', responseData);
            return res.status(response.status).json({
                success: false,
                message: responseData.message || responseData.error || 'Failed to cancel schedule',
                details: responseData
            });
        }

        console.log('Blotato schedule cancelled successfully');

        return res.status(200).json({
            success: true,
            message: 'Schedule cancelled successfully'
        });

    } catch (error: unknown) {
        console.error('Blotato cancel error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({
            success: false,
            message: `Cancel failed: ${errorMessage}`
        });
    }
}
