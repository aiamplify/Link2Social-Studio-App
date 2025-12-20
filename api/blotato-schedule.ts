/**
 * Blotato Schedule API Route
 *
 * Handles scheduling posts for future publishing via Blotato API.
 * Blotato manages the scheduling and publishes at the specified time.
 *
 * API Documentation: https://help.blotato.com/api/api-reference/publish-post
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Blotato API configuration - correct URL is backend.blotato.com/v2
const BLOTATO_API_URL = process.env.BLOTATO_API_URL || 'https://backend.blotato.com/v2';
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY || '';

// Platform account IDs from Blotato - get these from https://my.blotato.com/settings
// Each connected social account has a unique ID in Blotato
const PLATFORM_ACCOUNT_IDS: Record<string, string | undefined> = {
    twitter: process.env.BLOTATO_TWITTER_ACCOUNT_ID,
    facebook: process.env.BLOTATO_FACEBOOK_ACCOUNT_ID,
    instagram: process.env.BLOTATO_INSTAGRAM_ACCOUNT_ID,
    linkedin: process.env.BLOTATO_LINKEDIN_ACCOUNT_ID,
    bluesky: process.env.BLOTATO_BLUESKY_ACCOUNT_ID,
    threads: process.env.BLOTATO_THREADS_ACCOUNT_ID,
    tiktok: process.env.BLOTATO_TIKTOK_ACCOUNT_ID,
    youtube: process.env.BLOTATO_YOUTUBE_ACCOUNT_ID,
};

// Facebook and LinkedIn Page IDs (required for posting to Pages instead of profiles)
const FACEBOOK_PAGE_ID = process.env.BLOTATO_FACEBOOK_PAGE_ID;
const LINKEDIN_PAGE_ID = process.env.BLOTATO_LINKEDIN_PAGE_ID;

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
    accountId?: string; // Optional: override account ID
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
        const { caption, hashtags, media, platforms, scheduledAt, accountId } = req.body as ScheduleRequest;

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

        // Schedule to each platform separately (Blotato requires one post per account)
        const results = [];
        const errors = [];

        for (const platform of platforms) {
            // Get account ID for this platform
            const platformAccountId = accountId || PLATFORM_ACCOUNT_IDS[platform];

            if (!platformAccountId) {
                errors.push({
                    platform,
                    error: `No account ID configured for ${platform}. Add BLOTATO_${platform.toUpperCase()}_ACCOUNT_ID to environment variables.`
                });
                continue;
            }

            // Build the Blotato API request per their v2 API spec
            // Docs: https://help.blotato.com/api/api-reference/publish-post

            // Build target object - Facebook and LinkedIn Pages need pageId
            const target: Record<string, string> = { targetType: platform };
            if (platform === 'facebook' && FACEBOOK_PAGE_ID) {
                target.pageId = FACEBOOK_PAGE_ID;
            } else if (platform === 'linkedin' && LINKEDIN_PAGE_ID) {
                target.pageId = LINKEDIN_PAGE_ID;
            }

            const blotatoRequest = {
                post: {
                    accountId: platformAccountId,
                    content: {
                        text: hashtags?.length > 0
                            ? `${caption}\n\n${hashtags.map(h => `#${h}`).join(' ')}`
                            : caption,
                        mediaUrls: [], // Media URLs if already uploaded
                        platform: platform
                    },
                    target: target
                },
                scheduledTime: scheduledAt // ISO 8601 format
            };

            console.log(`Scheduling to ${platform} via Blotato for ${scheduleDate.toISOString()}`);

            try {
                // Make request to Blotato API v2
                const response = await fetch(`${BLOTATO_API_URL}/posts`, {
                    method: 'POST',
                    headers: {
                        'blotato-api-key': BLOTATO_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(blotatoRequest)
                });

                const responseData = await response.json();

                if (!response.ok) {
                    console.error(`Blotato schedule error for ${platform}:`, responseData);
                    errors.push({
                        platform,
                        error: responseData.message || responseData.error || 'Failed to schedule',
                        details: responseData
                    });
                } else {
                    console.log(`Blotato schedule successful for ${platform}:`, responseData);
                    results.push({
                        platform,
                        scheduleId: responseData.id || responseData.postId,
                        scheduledAt: scheduledAt
                    });
                }
            } catch (err) {
                console.error(`Error scheduling to ${platform}:`, err);
                errors.push({
                    platform,
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        }

        // Return results
        if (results.length === 0 && errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Failed to schedule to any platform',
                errors: errors
            });
        }

        return res.status(200).json({
            success: true,
            message: results.length === platforms.length
                ? 'Post scheduled successfully to all platforms'
                : `Post scheduled to ${results.length}/${platforms.length} platforms`,
            scheduleId: results[0]?.scheduleId,
            scheduledAt: scheduledAt,
            platforms: results.map(r => r.platform),
            results: results,
            errors: errors.length > 0 ? errors : undefined
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
