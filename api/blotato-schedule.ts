/**
 * Blotato Schedule API Route
 *
 * Handles scheduling posts for future publishing via Blotato API.
 * Blotato manages the scheduling and publishes at the specified time.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Blotato API configuration
const BLOTATO_API_URL = process.env.BLOTATO_API_URL || 'https://api.blotato.com/v1';
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY || '';

interface BlotatoMedia {
    type: 'image' | 'video';
    data: string;
    mimeType?: string;
}

interface ScheduleRequest {
    caption: string;
    hashtags: string[];
    media: BlotatoMedia[];
    platforms: string[];
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
        const { caption, hashtags, media, platforms, scheduledAt } = req.body as ScheduleRequest;

        // Validate required fields
        if (!caption || !platforms || platforms.length === 0 || !scheduledAt) {
            return res.status(400).json({
                success: false,
                message: 'Caption, at least one platform, and scheduled time are required'
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

        // Build the Blotato API request for scheduling
        const blotatoRequest = {
            content: {
                text: caption,
                hashtags: hashtags || [],
                media: media?.map(m => ({
                    type: m.type,
                    base64: m.data,
                    mimeType: m.mimeType
                })) || []
            },
            platforms: platforms,
            publishNow: false,
            scheduledTime: scheduledAt
        };

        console.log(`Scheduling via Blotato for ${scheduleDate.toISOString()} to platforms: ${platforms.join(', ')}`);

        // Make request to Blotato API
        const response = await fetch(`${BLOTATO_API_URL}/schedule`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${BLOTATO_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(blotatoRequest)
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Blotato schedule error:', responseData);
            return res.status(response.status).json({
                success: false,
                message: responseData.message || responseData.error || 'Failed to schedule via Blotato',
                details: responseData
            });
        }

        console.log('Blotato schedule successful:', responseData);

        return res.status(200).json({
            success: true,
            message: 'Post scheduled successfully with Blotato',
            scheduleId: responseData.id || responseData.scheduleId,
            scheduledAt: scheduledAt,
            platforms: platforms
        });

    } catch (error: unknown) {
        console.error('Blotato schedule error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({
            success: false,
            message: `Blotato scheduling failed: ${errorMessage}`
        });
    }
}
