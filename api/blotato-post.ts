/**
 * Blotato Post API Route
 *
 * Handles immediate posting to social media platforms via Blotato API.
 * Supports: Twitter, Facebook, Instagram, LinkedIn, BlueSky, Threads, TikTok, YouTube
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

interface PostRequest {
    caption: string;
    hashtags: string[];
    media: BlotatoMedia[];
    platforms: string[];
    scheduledAt?: string;
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
        const { caption, hashtags, media, platforms, scheduledAt } = req.body as PostRequest;

        // Validate required fields
        if (!caption || !platforms || platforms.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Caption and at least one platform are required'
            });
        }

        // Build the Blotato API request
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
            publishNow: !scheduledAt,
            scheduledTime: scheduledAt || undefined
        };

        console.log(`Posting to Blotato for platforms: ${platforms.join(', ')}`);

        // Make request to Blotato API
        const response = await fetch(`${BLOTATO_API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${BLOTATO_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(blotatoRequest)
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Blotato API error:', responseData);
            return res.status(response.status).json({
                success: false,
                message: responseData.message || responseData.error || 'Failed to post via Blotato',
                details: responseData
            });
        }

        console.log('Blotato post successful:', responseData);

        return res.status(200).json({
            success: true,
            message: scheduledAt ? 'Post scheduled successfully via Blotato' : 'Posted successfully via Blotato',
            blotatoPostId: responseData.id || responseData.postId,
            scheduledAt: scheduledAt,
            platformResults: responseData.results || platforms.map(p => ({
                platform: p,
                success: true,
                postId: responseData[`${p}PostId`],
                postUrl: responseData[`${p}PostUrl`]
            }))
        });

    } catch (error: unknown) {
        console.error('Blotato post error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({
            success: false,
            message: `Blotato posting failed: ${errorMessage}`
        });
    }
}
