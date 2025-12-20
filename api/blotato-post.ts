/**
 * Blotato Post API Route
 *
 * Handles immediate posting to social media platforms via Blotato API.
 * Supports: Twitter, Facebook, Instagram, LinkedIn, BlueSky, Threads, TikTok, YouTube
 *
 * API Documentation: https://help.blotato.com/api/api-reference/publish-post
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Blotato API configuration - correct URL is backend.blotato.com/v2
const BLOTATO_API_URL = process.env.BLOTATO_API_URL || 'https://backend.blotato.com/v2';
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY || '';

// Platform account IDs from Blotato - get these from https://my.blotato.com/settings
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

// Facebook and LinkedIn Page IDs (required for posting to Pages)
const FACEBOOK_PAGE_ID = process.env.BLOTATO_FACEBOOK_PAGE_ID;
const LINKEDIN_PAGE_ID = process.env.BLOTATO_LINKEDIN_PAGE_ID;

interface BlotatoMedia {
    type: 'image' | 'video';
    data: string;  // base64 or URL
    mimeType?: string;
}

interface PostRequest {
    caption: string;
    hashtags: string[];
    media: BlotatoMedia[];
    platforms: string[];
    accountId?: string;
}

/**
 * Upload media to Blotato and get back a hosted URL
 * Docs: https://help.blotato.com/api/api-reference/upload-media-v2-media
 */
async function uploadMediaToBlotato(mediaData: string): Promise<string | null> {
    try {
        // If it's already a URL, we can pass it directly or upload it
        const isUrl = mediaData.startsWith('http://') || mediaData.startsWith('https://');

        // For base64 data, we need to convert to a data URL format
        let mediaUrl = mediaData;
        if (!isUrl && !mediaData.startsWith('data:')) {
            // Assume it's base64 image data, prepend data URL prefix
            mediaUrl = `data:image/jpeg;base64,${mediaData}`;
        }

        const response = await fetch(`${BLOTATO_API_URL}/media`, {
            method: 'POST',
            headers: {
                'blotato-api-key': BLOTATO_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: mediaUrl })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Media upload failed:', errorData);
            return null;
        }

        const data = await response.json();
        console.log('Media uploaded successfully:', data.url || data.mediaUrl);
        return data.url || data.mediaUrl;
    } catch (error) {
        console.error('Error uploading media:', error);
        return null;
    }
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
        const { caption, hashtags, media, platforms, accountId } = req.body as PostRequest;

        // Validate required fields
        if (!caption || !platforms || platforms.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Caption and at least one platform are required'
            });
        }

        // Upload media first if provided
        const mediaUrls: string[] = [];
        if (media && media.length > 0) {
            console.log(`Uploading ${media.length} media files to Blotato...`);
            for (const m of media) {
                const uploadedUrl = await uploadMediaToBlotato(m.data);
                if (uploadedUrl) {
                    mediaUrls.push(uploadedUrl);
                } else {
                    console.warn('Failed to upload a media file, skipping...');
                }
            }
            console.log(`Successfully uploaded ${mediaUrls.length}/${media.length} media files`);
        }

        // Post to each platform separately (Blotato requires one post per account)
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

            // Build target object - Facebook and LinkedIn Pages need pageId
            const target: Record<string, string> = { targetType: platform };
            if (platform === 'facebook' && FACEBOOK_PAGE_ID) {
                target.pageId = FACEBOOK_PAGE_ID;
            } else if (platform === 'linkedin' && LINKEDIN_PAGE_ID) {
                target.pageId = LINKEDIN_PAGE_ID;
            }

            // Build the Blotato API request per their v2 API spec
            // Docs: https://help.blotato.com/api/api-reference/publish-post
            const blotatoRequest = {
                post: {
                    accountId: platformAccountId,
                    content: {
                        text: hashtags?.length > 0
                            ? `${caption}\n\n${hashtags.map(h => `#${h}`).join(' ')}`
                            : caption,
                        mediaUrls: mediaUrls,
                        platform: platform
                    },
                    target: target
                }
                // No scheduledTime = publish immediately
            };

            console.log(`Posting to ${platform} via Blotato...`);

            try {
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
                    console.error(`Blotato post error for ${platform}:`, responseData);
                    errors.push({
                        platform,
                        error: responseData.message || responseData.error || 'Failed to post',
                        details: responseData
                    });
                } else {
                    console.log(`Blotato post successful for ${platform}:`, responseData);
                    results.push({
                        platform,
                        postId: responseData.id || responseData.postId,
                        postUrl: responseData.postUrl
                    });
                }
            } catch (err) {
                console.error(`Error posting to ${platform}:`, err);
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
                message: 'Failed to post to any platform',
                errors: errors
            });
        }

        return res.status(200).json({
            success: true,
            message: results.length === platforms.length
                ? 'Posted successfully to all platforms'
                : `Posted to ${results.length}/${platforms.length} platforms`,
            blotatoPostId: results[0]?.postId,
            platforms: results.map(r => r.platform),
            results: results,
            errors: errors.length > 0 ? errors : undefined
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
