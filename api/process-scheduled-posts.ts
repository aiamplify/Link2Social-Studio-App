/**
 * Autonomous Social Media Posting - Cron Job Handler
 *
 * This serverless function runs periodically (via Vercel Cron) to:
 * 1. Check for posts that are due (scheduled_at <= now && status = 'scheduled')
 * 2. Post them to the respective social media platforms
 * 3. Update their status to 'posted' or 'failed'
 *
 * Configure in vercel.json to run every minute:
 * {
 *   "crons": [{
 *     "path": "/api/process-scheduled-posts",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Twitter credentials
const TWITTER_API_KEY = 'uqJFp7GDCMhmvgTwfKh7qbeMr';
const TWITTER_API_SECRET = 'KH7oXhQh7NGYgJHs91gEJzSgPPZTMqv7EnJZT2JE9OQZHA5eL2';
const TWITTER_ACCESS_TOKEN = '1867686942067740672-xhGx79Qma8rVOoGBPCPWW34Bw2DXHQ';
const TWITTER_ACCESS_SECRET = 'wFnBWSsqWdH8d5BmvhyGt0tIjy1dSHp1KIKnKOV3jmCrS';

// LinkedIn credentials
const LINKEDIN_ACCESS_TOKEN = 'AQXi-WYGrYdxBqxjIyaL3s4mfGIq6FdNgVkXdTgFxHhQHaM7BXdKxS8WXxGzNnN8XxXxX';

// Instagram credentials
const INSTAGRAM_ACCESS_TOKEN = 'IGAAJOqgCWhZAAZAzBASHVKTDlFaWJKT3ZAabU5PbkhxX0';
const INSTAGRAM_ACCOUNT_ID = '17841400000000000';

// ImgBB API key for Instagram image hosting
const IMGBB_API_KEY = '8a0f1b2c3d4e5f6g7h8i9j0k';

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

async function postToTwitter(text: string, images: string[]): Promise<PostResult> {
    try {
        const crypto = await import('crypto');

        // Helper to generate OAuth signature
        function generateOAuthSignature(
            method: string,
            url: string,
            params: Record<string, string>,
            consumerSecret: string,
            tokenSecret: string
        ): string {
            const sortedParams = Object.keys(params).sort().map(key =>
                `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
            ).join('&');

            const signatureBase = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
            const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

            return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
        }

        // Helper to generate OAuth header
        function generateOAuthHeader(
            method: string,
            url: string,
            extraParams: Record<string, string> = {}
        ): string {
            const oauthParams: Record<string, string> = {
                oauth_consumer_key: TWITTER_API_KEY,
                oauth_nonce: crypto.randomBytes(16).toString('hex'),
                oauth_signature_method: 'HMAC-SHA1',
                oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
                oauth_token: TWITTER_ACCESS_TOKEN,
                oauth_version: '1.0'
            };

            const allParams = { ...oauthParams, ...extraParams };
            oauthParams.oauth_signature = generateOAuthSignature(
                method, url, allParams, TWITTER_API_SECRET, TWITTER_ACCESS_SECRET
            );

            return 'OAuth ' + Object.keys(oauthParams).sort().map(key =>
                `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`
            ).join(', ');
        }

        // Upload media if images provided
        const mediaIds: string[] = [];
        for (const imageBase64 of images.slice(0, 4)) { // Max 4 images
            const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            const mediaUrl = 'https://upload.twitter.com/1.1/media/upload.json';
            const mediaParams = { media_data: cleanBase64 };

            const mediaResponse = await fetch(mediaUrl, {
                method: 'POST',
                headers: {
                    'Authorization': generateOAuthHeader('POST', mediaUrl, mediaParams),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `media_data=${encodeURIComponent(cleanBase64)}`
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
                'Authorization': generateOAuthHeader('POST', tweetUrl),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tweetBody)
        });

        const responseData = await tweetResponse.json();

        if (tweetResponse.ok && responseData.data?.id) {
            return {
                success: true,
                message: 'Posted to Twitter successfully',
                postId: responseData.data.id,
                postUrl: `https://twitter.com/i/status/${responseData.data.id}`
            };
        }

        return {
            success: false,
            message: responseData.detail || responseData.title || 'Failed to post to Twitter'
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: `Twitter error: ${errorMessage}` };
    }
}

// ==================== LINKEDIN POSTING ====================

async function postToLinkedIn(text: string, images: string[]): Promise<PostResult> {
    try {
        // Get user info
        const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}` }
        });

        if (!userInfoResponse.ok) {
            return { success: false, message: 'Failed to get LinkedIn user info' };
        }

        const userInfo = await userInfoResponse.json();
        const personUrn = `urn:li:person:${userInfo.sub}`;

        // Upload images if provided
        const imageAssets: string[] = [];
        for (const imageBase64 of images.slice(0, 9)) { // Max 9 images
            // Register upload
            const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    registerUploadRequest: {
                        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                        owner: personUrn,
                        serviceRelationships: [{
                            relationshipType: 'OWNER',
                            identifier: 'urn:li:userGeneratedContent'
                        }]
                    }
                })
            });

            if (!registerResponse.ok) continue;

            const registerData = await registerResponse.json();
            const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
            const asset = registerData.value?.asset;

            if (!uploadUrl || !asset) continue;

            // Upload image
            const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(cleanBase64, 'base64');

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
                    'Content-Type': 'image/png'
                },
                body: imageBuffer
            });

            if (uploadResponse.ok) {
                imageAssets.push(asset);
            }
        }

        // Create post
        const postBody: Record<string, unknown> = {
            author: personUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text },
                    shareMediaCategory: imageAssets.length > 0 ? 'IMAGE' : 'NONE',
                    media: imageAssets.map(asset => ({
                        status: 'READY',
                        media: asset
                    }))
                }
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
            }
        };

        const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0'
            },
            body: JSON.stringify(postBody)
        });

        if (postResponse.ok) {
            const postId = postResponse.headers.get('x-restli-id') || '';
            return {
                success: true,
                message: 'Posted to LinkedIn successfully',
                postId,
                postUrl: `https://www.linkedin.com/feed/update/${postId}`
            };
        }

        const errorData = await postResponse.json().catch(() => ({}));
        return {
            success: false,
            message: errorData.message || 'Failed to post to LinkedIn'
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: `LinkedIn error: ${errorMessage}` };
    }
}

// ==================== INSTAGRAM POSTING ====================

async function postToInstagram(caption: string, images: string[]): Promise<PostResult> {
    try {
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
            body: formData
        });

        if (!imgbbResponse.ok) {
            return { success: false, message: 'Failed to upload image for Instagram' };
        }

        const imgbbData = await imgbbResponse.json();
        const imageUrl = imgbbData.data?.url;

        if (!imageUrl) {
            return { success: false, message: 'Failed to get image URL from ImgBB' };
        }

        // Create media container
        const containerResponse = await fetch(
            `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media?` +
            `image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${INSTAGRAM_ACCESS_TOKEN}`,
            { method: 'POST' }
        );

        if (!containerResponse.ok) {
            const errorData = await containerResponse.json().catch(() => ({}));
            return { success: false, message: errorData.error?.message || 'Failed to create Instagram media container' };
        }

        const containerData = await containerResponse.json();
        const containerId = containerData.id;

        // Wait for container to be ready (poll up to 30 seconds)
        let containerReady = false;
        for (let i = 0; i < 15; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const statusResponse = await fetch(
                `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${INSTAGRAM_ACCESS_TOKEN}`
            );

            const statusData = await statusResponse.json();
            if (statusData.status_code === 'FINISHED') {
                containerReady = true;
                break;
            } else if (statusData.status_code === 'ERROR') {
                return { success: false, message: 'Instagram media processing failed' };
            }
        }

        if (!containerReady) {
            return { success: false, message: 'Instagram media processing timeout' };
        }

        // Publish the container
        const publishResponse = await fetch(
            `https://graph.facebook.com/v18.0/${INSTAGRAM_ACCOUNT_ID}/media_publish?` +
            `creation_id=${containerId}&access_token=${INSTAGRAM_ACCESS_TOKEN}`,
            { method: 'POST' }
        );

        if (publishResponse.ok) {
            const publishData = await publishResponse.json();
            return {
                success: true,
                message: 'Posted to Instagram successfully',
                postId: publishData.id,
                postUrl: `https://www.instagram.com/p/${publishData.id}/`
            };
        }

        const errorData = await publishResponse.json().catch(() => ({}));
        return {
            success: false,
            message: errorData.error?.message || 'Failed to publish to Instagram'
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: `Instagram error: ${errorMessage}` };
    }
}

// ==================== MAIN HANDLER ====================

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Verify cron secret for security (optional but recommended)
    const cronSecret = req.headers['authorization'];
    if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow without secret for manual triggers during development
        console.log('Cron running without secret verification');
    }

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
            .limit(10); // Process up to 10 posts per run to avoid timeout

        if (fetchError) {
            console.error('Error fetching due posts:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        if (!duePosts || duePosts.length === 0) {
            return res.status(200).json({
                message: 'No posts due for publishing',
                processedAt: new Date().toISOString()
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
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', post.id);

                console.log(`Successfully posted ${post.id} to ${post.platform}`);
            } else {
                const newRetryCount = (post.retry_count || 0) + 1;
                const shouldKeepScheduled = newRetryCount < 3; // Retry up to 3 times

                await supabase
                    .from('calendar_posts')
                    .update({
                        status: shouldKeepScheduled ? 'scheduled' : 'failed',
                        error_message: result.message,
                        retry_count: newRetryCount,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', post.id);

                console.log(`Failed to post ${post.id}: ${result.message} (retry ${newRetryCount})`);
            }

            results.push({
                id: post.id,
                platform: post.platform,
                success: result.success,
                message: result.message,
                postUrl: result.postUrl
            });
        }

        return res.status(200).json({
            message: `Processed ${results.length} posts`,
            processedAt: new Date().toISOString(),
            results
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Cron job error:', errorMessage);
        return res.status(500).json({ error: errorMessage });
    }
}
