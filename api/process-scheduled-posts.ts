/**
 * Autonomous Social Media Posting - Cron Job Handler
 *
 * This serverless function runs periodically (via Vercel Cron) to:
 * 1. Check for posts that are due (scheduled_at <= now && status = 'scheduled')
 * 2. Post them to the respective social media platforms
 * 3. Update their status to 'posted' or 'failed'
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Twitter credentials from environment variables
const TWITTER_CREDENTIALS = {
    apiKey: process.env.TWITTER_API_KEY || '',
    apiSecret: process.env.TWITTER_API_SECRET || '',
    accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
};

// LinkedIn credentials from environment variables
const LINKEDIN_CREDENTIALS = {
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
};

// Instagram credentials from environment variables
const INSTAGRAM_CREDENTIALS = {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
    accountId: process.env.INSTAGRAM_ACCOUNT_ID || '',
};

// ImgBB API key for image hosting
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '';

interface CalendarPost {
    id: string;
    title: string;
    content: string;
    platform: 'twitter' | 'linkedin' | 'instagram';
    scheduled_at: string;
    status: string;
    images: string[];
    retry_count: number;
}

interface PostResult {
    success: boolean;
    message: string;
    postId?: string;
    postUrl?: string;
}

// ==================== TWITTER POSTING ====================

function generateOAuthSignature(
    method: string,
    url: string,
    params: Record<string, string>
): string {
    const oauthParams: Record<string, string> = {
        oauth_consumer_key: TWITTER_CREDENTIALS.apiKey,
        oauth_token: TWITTER_CREDENTIALS.accessToken,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_nonce: crypto.randomBytes(16).toString('hex'),
        oauth_version: '1.0',
        ...params,
    };

    const sortedKeys = Object.keys(oauthParams).sort();
    const paramString = sortedKeys
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
        .join('&');

    const signatureBaseString = [
        method.toUpperCase(),
        encodeURIComponent(url),
        encodeURIComponent(paramString),
    ].join('&');

    const signingKey = `${encodeURIComponent(TWITTER_CREDENTIALS.apiSecret)}&${encodeURIComponent(TWITTER_CREDENTIALS.accessTokenSecret)}`;
    const signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');

    return signature;
}

function generateOAuthHeader(method: string, url: string, params: Record<string, string> = {}): string {
    const oauthParams: Record<string, string> = {
        oauth_consumer_key: TWITTER_CREDENTIALS.apiKey,
        oauth_token: TWITTER_CREDENTIALS.accessToken,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_nonce: crypto.randomBytes(16).toString('hex'),
        oauth_version: '1.0',
    };

    const allParams = { ...oauthParams, ...params };
    oauthParams.oauth_signature = generateOAuthSignature(method, url, allParams);

    const headerParams = Object.keys(oauthParams)
        .sort()
        .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
        .join(', ');

    return `OAuth ${headerParams}`;
}

async function postToTwitter(text: string, images: string[]): Promise<PostResult> {
    try {
        if (!TWITTER_CREDENTIALS.apiKey) {
            return { success: false, message: 'Twitter credentials not configured' };
        }

        const mediaIds: string[] = [];

        // Upload images if provided (max 4)
        for (const imageBase64 of images.slice(0, 4)) {
            const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            const mediaUrl = 'https://upload.twitter.com/1.1/media/upload.json';

            const mediaResponse = await fetch(mediaUrl, {
                method: 'POST',
                headers: {
                    Authorization: generateOAuthHeader('POST', mediaUrl, { media_data: cleanBase64 }),
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `media_data=${encodeURIComponent(cleanBase64)}`,
            });

            if (mediaResponse.ok) {
                const mediaData = await mediaResponse.json();
                if (mediaData.media_id_string) {
                    mediaIds.push(mediaData.media_id_string);
                }
            }
        }

        // Post tweet
        const tweetUrl = 'https://api.twitter.com/2/tweets';
        const tweetBody: { text: string; media?: { media_ids: string[] } } = { text };

        if (mediaIds.length > 0) {
            tweetBody.media = { media_ids: mediaIds };
        }

        const tweetResponse = await fetch(tweetUrl, {
            method: 'POST',
            headers: {
                Authorization: generateOAuthHeader('POST', tweetUrl),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tweetBody),
        });

        const responseData = await tweetResponse.json();

        if (tweetResponse.ok && responseData.data?.id) {
            return {
                success: true,
                message: 'Posted to Twitter successfully',
                postId: responseData.data.id,
                postUrl: `https://twitter.com/i/status/${responseData.data.id}`,
            };
        }

        return {
            success: false,
            message: responseData.detail || responseData.title || 'Failed to post to Twitter',
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: `Twitter error: ${errorMessage}` };
    }
}

// ==================== LINKEDIN POSTING ====================

async function postToLinkedIn(text: string, images: string[]): Promise<PostResult> {
    try {
        if (!LINKEDIN_CREDENTIALS.accessToken) {
            return { success: false, message: 'LinkedIn credentials not configured' };
        }

        // Get user info
        const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${LINKEDIN_CREDENTIALS.accessToken}` },
        });

        if (!userInfoResponse.ok) {
            return { success: false, message: 'Failed to get LinkedIn user info' };
        }

        const userInfo = await userInfoResponse.json();
        const personUrn = `urn:li:person:${userInfo.sub}`;

        // Create post (simplified - without images for now)
        const postBody = {
            author: personUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text },
                    shareMediaCategory: 'NONE',
                },
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
        };

        const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${LINKEDIN_CREDENTIALS.accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify(postBody),
        });

        if (postResponse.ok) {
            const postId = postResponse.headers.get('x-restli-id') || '';
            return {
                success: true,
                message: 'Posted to LinkedIn successfully',
                postId,
                postUrl: `https://www.linkedin.com/feed/update/${postId}`,
            };
        }

        return { success: false, message: 'Failed to post to LinkedIn' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: `LinkedIn error: ${errorMessage}` };
    }
}

// ==================== INSTAGRAM POSTING ====================

async function postToInstagram(caption: string, images: string[]): Promise<PostResult> {
    try {
        if (!INSTAGRAM_CREDENTIALS.accessToken || !INSTAGRAM_CREDENTIALS.accountId) {
            return { success: false, message: 'Instagram credentials not configured' };
        }

        if (images.length === 0) {
            return { success: false, message: 'Instagram requires at least one image' };
        }

        // Upload image to ImgBB first
        const cleanBase64 = images[0].replace(/^data:image\/\w+;base64,/, '');
        const formData = new URLSearchParams();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', cleanBase64);

        const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData,
        });

        if (!imgbbResponse.ok) {
            return { success: false, message: 'Failed to upload image for Instagram' };
        }

        const imgbbData = await imgbbResponse.json();
        const imageUrl = imgbbData.data?.url;

        if (!imageUrl) {
            return { success: false, message: 'Failed to get image URL' };
        }

        // Create media container
        const containerResponse = await fetch(
            `https://graph.facebook.com/v18.0/${INSTAGRAM_CREDENTIALS.accountId}/media?` +
                `image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${INSTAGRAM_CREDENTIALS.accessToken}`,
            { method: 'POST' }
        );

        if (!containerResponse.ok) {
            return { success: false, message: 'Failed to create Instagram media container' };
        }

        const containerData = await containerResponse.json();
        const containerId = containerData.id;

        // Wait for container to be ready
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Publish
        const publishResponse = await fetch(
            `https://graph.facebook.com/v18.0/${INSTAGRAM_CREDENTIALS.accountId}/media_publish?` +
                `creation_id=${containerId}&access_token=${INSTAGRAM_CREDENTIALS.accessToken}`,
            { method: 'POST' }
        );

        if (publishResponse.ok) {
            const publishData = await publishResponse.json();
            return {
                success: true,
                message: 'Posted to Instagram successfully',
                postId: publishData.id,
            };
        }

        return { success: false, message: 'Failed to publish to Instagram' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: `Instagram error: ${errorMessage}` };
    }
}

// ==================== MAIN HANDLER ====================

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('Processing scheduled posts at:', new Date().toISOString());

    try {
        // Fetch posts that are due
        const now = new Date().toISOString();
        const { data: duePosts, error: fetchError } = await supabase
            .from('calendar_posts')
            .select('*')
            .eq('status', 'scheduled')
            .lte('scheduled_at', now)
            .order('scheduled_at', { ascending: true })
            .limit(10);

        if (fetchError) {
            console.error('Error fetching due posts:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        if (!duePosts || duePosts.length === 0) {
            return res.status(200).json({
                message: 'No posts due for publishing',
                processedAt: new Date().toISOString(),
            });
        }

        console.log(`Found ${duePosts.length} posts to process`);

        const results: Array<{
            id: string;
            platform: string;
            success: boolean;
            message: string;
            postUrl?: string;
        }> = [];

        // Process each post
        for (const post of duePosts as CalendarPost[]) {
            console.log(`Processing post ${post.id} for ${post.platform}`);

            // Mark as posting
            await supabase
                .from('calendar_posts')
                .update({ status: 'posting', updated_at: new Date().toISOString() })
                .eq('id', post.id);

            let result: PostResult;

            // Post to the appropriate platform
            switch (post.platform) {
                case 'twitter':
                    result = await postToTwitter(post.content, post.images || []);
                    break;
                case 'linkedin':
                    result = await postToLinkedIn(post.content, post.images || []);
                    break;
                case 'instagram':
                    result = await postToInstagram(post.content, post.images || []);
                    break;
                default:
                    result = { success: false, message: `Unknown platform: ${post.platform}` };
            }

            // Update post status based on result
            if (result.success) {
                await supabase
                    .from('calendar_posts')
                    .update({
                        status: 'posted',
                        posted_at: new Date().toISOString(),
                        post_url: result.postUrl,
                        post_id: result.postId,
                        error_message: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', post.id);

                console.log(`Successfully posted ${post.id} to ${post.platform}`);
            } else {
                const newRetryCount = (post.retry_count || 0) + 1;
                const shouldKeepScheduled = newRetryCount < 3;

                await supabase
                    .from('calendar_posts')
                    .update({
                        status: shouldKeepScheduled ? 'scheduled' : 'failed',
                        error_message: result.message,
                        retry_count: newRetryCount,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', post.id);

                console.log(`Failed to post ${post.id}: ${result.message} (retry ${newRetryCount})`);
            }

            results.push({
                id: post.id,
                platform: post.platform,
                success: result.success,
                message: result.message,
                postUrl: result.postUrl,
            });
        }

        return res.status(200).json({
            message: `Processed ${results.length} posts`,
            processedAt: new Date().toISOString(),
            results,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Cron job error:', errorMessage);
        return res.status(500).json({ error: errorMessage });
    }
}
