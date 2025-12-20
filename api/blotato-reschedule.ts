/**
 * Blotato Reschedule API Route
 *
 * Handles rescheduling of posts via Blotato API.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Blotato API configuration - correct URL is backend.blotato.com/v2
const BLOTATO_API_URL = process.env.BLOTATO_API_URL || 'https://backend.blotato.com/v2';
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY || '';

interface RescheduleRequest {
    scheduleId: string;
    scheduledAt: string;
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
        const { scheduleId, scheduledAt } = req.body as RescheduleRequest;

        // Validate required fields
        if (!scheduleId || !scheduledAt) {
            return res.status(400).json({
                success: false,
                message: 'Schedule ID and new scheduled time are required'
            });
        }

        // Validate scheduled time is in the future
        const scheduleDate = new Date(scheduledAt);
        if (scheduleDate <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Scheduled time must be in the future'
            });
        }

        console.log(`Rescheduling Blotato schedule ${scheduleId} to ${scheduledAt}`);

        // Make request to Blotato API v2
        const response = await fetch(`${BLOTATO_API_URL}/posts/${scheduleId}`, {
            method: 'PATCH',
            headers: {
                'blotato-api-key': BLOTATO_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                scheduledTime: scheduledAt
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Blotato reschedule error:', responseData);
            return res.status(response.status).json({
                success: false,
                message: responseData.message || responseData.error || 'Failed to reschedule',
                details: responseData
            });
        }

        console.log('Blotato reschedule successful:', responseData);

        return res.status(200).json({
            success: true,
            message: 'Rescheduled successfully',
            scheduleId: scheduleId,
            scheduledAt: scheduledAt,
            platforms: responseData.platforms || []
        });

    } catch (error: unknown) {
        console.error('Blotato reschedule error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({
            success: false,
            message: `Reschedule failed: ${errorMessage}`
        });
    }
}
