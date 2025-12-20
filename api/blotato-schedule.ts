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

    // Log the API URL being used (for debugging)
    console.log(`Using Blotato API URL: ${BLOTATO_API_URL}`);

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

        // Provide more specific error messages based on error type
        let errorMessage = 'Unknown error occurred';
        let statusCode = 500;

        if (error instanceof Error) {
            errorMessage = error.message;

            // Check for common network errors
            if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
                errorMessage = 'Unable to connect to Blotato API. The service may be temporarily unavailable.';
                statusCode = 503;
            } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
                errorMessage = 'Connection to Blotato API timed out. Please try again.';
                statusCode = 504;
            } else if (error.message.includes('ENOTFOUND')) {
                errorMessage = 'Blotato API host not found. Please check the API URL configuration.';
                statusCode = 503;
            } else if (error.message.includes('certificate') || error.message.includes('SSL')) {
                errorMessage = 'SSL/TLS error connecting to Blotato API.';
                statusCode = 502;
            }
        }

        return res.status(statusCode).json({
            success: false,
            message: `Blotato scheduling failed: ${errorMessage}`,
            hint: 'If this persists, please verify your BLOTATO_API_KEY environment variable is set correctly.'
        });
    }
}
