/**
 * Social Media Posting Service
 *
 * This service handles posting content to Twitter, LinkedIn, and Instagram.
 * Credentials are hardcoded for personal use in a private repository.
 */

// =============================================================================
// API CREDENTIALS - HARDCODE YOUR VALUES HERE
// =============================================================================

// Twitter (X) API Credentials - OAuth 1.0a User Context
// Get these from: https://developer.twitter.com/en/portal/dashboard
const TWITTER_CREDENTIALS = {
    apiKey: 'ad9Nxpyud2BBcxs6JKl6DjMWd',
    apiKeySecret: 'kOprhIQtyjAcr3sxrNzuZHP1F3Bdr0D1toCAk894GhI4NX1Bm6',
    accessToken: '1759762781132267520-WavUIq5G7oGcPWUTaWNdmFXpL4eY5P',
    accessTokenSecret: 'L3yBPHU63pTtJpCPIJMdxIQub4amkgjXxM53WAOonztN0',
    bearerToken: 'AAAAAAAAAAAAAAAAAAAAAAN45wEAAAAA%2FWs6oR5e0s2qeWQZL6dtzPbsyf0%3DTRwwUNFrs1ST4FCTx2SOe2Idl32HLXkW8KaXMP1UmJWvst5STf',
};

// LinkedIn API Credentials - OAuth 2.0
// Get these from: https://www.linkedin.com/developers/apps
const LINKEDIN_CREDENTIALS = {
    clientId: '78oabx8n7pnabq',
    clientSecret: 'WPL_AP1.rWM81mMI5QUstFAu.YPQo6A==',
    accessToken: 'AQU6GxpezWX9MdtSKzNp2OoB7wLv7H2__9z6N7b00cF-OEP36g3IPfINNSiswEbhBrmA034TNW4utOizB9tdF_gOEPaXP1v4i5h5aPjFL4YKSlgi5qtvB-urHO2H8kOFXKfhsk0oMw_QF5996Y7o1KtA8zp8DfsyBaIL3VMUUcfK8V9ERxl087URHyMwYO-Lif_0UR382jL9ImiGSojlskbX5Pbb4_URc3I1725FYcSmZy8pjrdb7jul6nctMzO26fw5SorrgAQ1LMKnsxq0m3X11PDD7LgPQ6gWO38_3ifdKQbIcuj51XL6Fd4_wGj5QPELrUjlea0tuDG3UEkv9XuSX1G1hQ',
    personUrn: 'urn:li:person:-YApe9-tqr',
};

// Instagram API Credentials - Instagram Graph API (via Facebook)
// Get these from: https://developers.facebook.com/apps
// Long-lived Page Access Token - expires ~60 days (early Feb 2026)
const INSTAGRAM_CREDENTIALS = {
    accessToken: 'EAAoLa0r1ya8BQO3vVOmT4wM8XEWYf22M4zFcOvMrDisUv63Ap3XDz4IeWdUwUBAMICJPs5ZADf7ZASJiq6hFV12sNtl3ADIHFqlA01ZCNnp457sPuvxKb0pZAdJYVl6CV2ZCaBkImkZCCPXdR82nFH0GdUbRezgBZB5bZBJDCf1RtqZAUzXItesR0RyNeru0L0zZBXhesZD',
    instagramAccountId: '17841460156952672',
    facebookPageId: '100224776504039',
};

// ImgBB API for hosting images (free tier available)
// Get your API key from: https://api.imgbb.com/
const IMGBB_API_KEY = ''; // Add your ImgBB API key here for Instagram support

// =============================================================================
// TYPES
// =============================================================================

export interface PostResult {
    success: boolean;
    message: string;
    postId?: string;
    postUrl?: string;
}

// =============================================================================
// IMAGE HOSTING HELPER (for Instagram)
// =============================================================================

/**
 * Uploads an image to ImgBB and returns the public URL
 */
async function uploadToImgBB(base64Image: string): Promise<string | null> {
    if (!IMGBB_API_KEY) {
        return null;
    }

    try {
        const formData = new FormData();
        formData.append('image', base64Image);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            console.error('ImgBB upload failed');
            return null;
        }

        const data = await response.json();
        return data.data?.url || null;
    } catch (error) {
        console.error('ImgBB upload error:', error);
        return null;
    }
}

// =============================================================================
// TWITTER POSTING
// =============================================================================

/**
 * Posts content to Twitter (X)
 * Uses OAuth 2.0 Bearer Token for simpler authentication
 * Note: For posting with images, you need elevated API access
 */
export async function postToTwitter(text: string, images: string[] = []): Promise<PostResult> {
    const { apiKey, apiKeySecret, accessToken, accessTokenSecret } = TWITTER_CREDENTIALS;

    // Check if credentials are configured
    if (!apiKey || !accessToken) {
        return {
            success: false,
            message: 'Twitter credentials not configured. Please add your API keys to socialMediaService.ts'
        };
    }

    try {
        // Generate OAuth 1.0a header
        const authHeader = await generateTwitterOAuth1Header(
            'POST',
            'https://api.twitter.com/2/tweets',
            {},
            apiKey,
            apiKeySecret,
            accessToken,
            accessTokenSecret
        );

        // Create the tweet (text only for now - media requires additional setup)
        const tweetData: any = { text };

        const response = await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tweetData),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Twitter API error:', responseData);
            throw new Error(responseData.detail || responseData.title || responseData.errors?.[0]?.message || 'Failed to post tweet');
        }

        return {
            success: true,
            message: 'Successfully posted to Twitter!',
            postId: responseData.data?.id,
            postUrl: responseData.data?.id ? `https://twitter.com/i/web/status/${responseData.data.id}` : undefined,
        };
    } catch (error: any) {
        console.error('Twitter posting error:', error);
        return {
            success: false,
            message: error.message || 'Failed to post to Twitter',
        };
    }
}

// =============================================================================
// LINKEDIN POSTING
// =============================================================================

/**
 * Posts content to LinkedIn using the new Posts API
 * Supports text posts; image support requires additional setup
 */
export async function postToLinkedIn(text: string, images: string[] = []): Promise<PostResult> {
    const { accessToken, personUrn } = LINKEDIN_CREDENTIALS;

    // Check if credentials are configured
    if (!accessToken || !personUrn) {
        return {
            success: false,
            message: 'LinkedIn credentials not configured. Please add your API credentials to socialMediaService.ts'
        };
    }

    try {
        // Use the new Posts API (v2)
        const postData = {
            author: personUrn,
            commentary: text,
            visibility: 'PUBLIC',
            distribution: {
                feedDistribution: 'MAIN_FEED',
                targetEntities: [],
                thirdPartyDistributionChannels: []
            },
            lifecycleState: 'PUBLISHED',
            isReshareDisabledByAuthor: false
        };

        const response = await fetch('https://api.linkedin.com/rest/posts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202401'
            },
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('LinkedIn API error:', errorText);

            let errorMessage = 'Failed to create LinkedIn post';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                // Use default error message
            }
            throw new Error(errorMessage);
        }

        // LinkedIn returns 201 with x-restli-id header containing the post URN
        const postUrn = response.headers.get('x-restli-id');

        return {
            success: true,
            message: 'Successfully posted to LinkedIn!',
            postId: postUrn || undefined,
        };
    } catch (error: any) {
        console.error('LinkedIn posting error:', error);
        return {
            success: false,
            message: error.message || 'Failed to post to LinkedIn',
        };
    }
}

// =============================================================================
// INSTAGRAM POSTING
// =============================================================================

/**
 * Posts content to Instagram
 * Uses Instagram Graph API (requires Facebook Business account)
 *
 * IMPORTANT: Instagram requires images to be hosted on a public URL.
 * Options:
 * 1. Add an ImgBB API key above for automatic image hosting
 * 2. Manually upload images and provide URLs
 */
export async function postToInstagram(caption: string, images: string[] = []): Promise<PostResult> {
    const { accessToken, instagramAccountId } = INSTAGRAM_CREDENTIALS;

    // Check if credentials are configured
    if (!accessToken || !instagramAccountId) {
        return {
            success: false,
            message: 'Instagram credentials not configured. Please add your API credentials to socialMediaService.ts'
        };
    }

    try {
        if (images.length === 0) {
            return {
                success: false,
                message: 'Instagram requires at least one image to post.',
            };
        }

        // Try to upload image to ImgBB if API key is configured
        let imageUrl: string | null = null;

        if (IMGBB_API_KEY) {
            imageUrl = await uploadToImgBB(images[0]);
        }

        if (!imageUrl) {
            return {
                success: false,
                message: 'Instagram requires images hosted on a public URL. Please add an ImgBB API key to socialMediaService.ts (get one free at https://api.imgbb.com/)',
            };
        }

        // Step 1: Create media container
        const createMediaResponse = await fetch(
            `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_url: imageUrl,
                    caption: caption,
                    access_token: accessToken,
                }),
            }
        );

        if (!createMediaResponse.ok) {
            const errorData = await createMediaResponse.json();
            throw new Error(errorData.error?.message || 'Failed to create Instagram media container');
        }

        const mediaData = await createMediaResponse.json();
        const containerId = mediaData.id;

        // Step 2: Publish the container
        const publishResponse = await fetch(
            `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    creation_id: containerId,
                    access_token: accessToken,
                }),
            }
        );

        if (!publishResponse.ok) {
            const errorData = await publishResponse.json();
            throw new Error(errorData.error?.message || 'Failed to publish Instagram post');
        }

        const result = await publishResponse.json();
        return {
            success: true,
            message: 'Successfully posted to Instagram!',
            postId: result.id,
        };
    } catch (error: any) {
        console.error('Instagram posting error:', error);
        return {
            success: false,
            message: error.message || 'Failed to post to Instagram',
        };
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates OAuth 1.0a Authorization header for Twitter API
 */
async function generateTwitterOAuth1Header(
    method: string,
    url: string,
    params: Record<string, string>,
    apiKey: string,
    apiKeySecret: string,
    accessToken: string,
    accessTokenSecret: string
): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();

    const oauthParams: Record<string, string> = {
        oauth_consumer_key: apiKey,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_token: accessToken,
        oauth_version: '1.0',
    };

    // Combine OAuth params and request params
    const allParams = { ...oauthParams, ...params };

    // Sort and encode parameters
    const sortedParams = Object.keys(allParams)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
        .join('&');

    // Create signature base string
    const signatureBase = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;

    // Create signing key
    const signingKey = `${encodeURIComponent(apiKeySecret)}&${encodeURIComponent(accessTokenSecret)}`;

    // Generate signature using HMAC-SHA1 (await the async function)
    const signature = await generateHmacSha1Signature(signatureBase, signingKey);

    // Build Authorization header
    const authHeader = Object.entries({
        ...oauthParams,
        oauth_signature: signature,
    })
        .map(([key, value]) => `${encodeURIComponent(key)}="${encodeURIComponent(value)}"`)
        .join(', ');

    return `OAuth ${authHeader}`;
}

/**
 * Generates a random nonce for OAuth
 */
function generateNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generates HMAC-SHA1 signature using Web Crypto API
 */
async function generateHmacSha1Signature(data: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

    // Convert to base64
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// =============================================================================
// CREDENTIAL VALIDATION
// =============================================================================

/**
 * Check if Twitter credentials are configured
 */
export function isTwitterConfigured(): boolean {
    return !!(TWITTER_CREDENTIALS.apiKey && TWITTER_CREDENTIALS.accessToken);
}

/**
 * Check if LinkedIn credentials are configured
 */
export function isLinkedInConfigured(): boolean {
    return !!(LINKEDIN_CREDENTIALS.accessToken && LINKEDIN_CREDENTIALS.personUrn);
}

/**
 * Check if Instagram credentials are configured
 */
export function isInstagramConfigured(): boolean {
    return !!(INSTAGRAM_CREDENTIALS.accessToken && INSTAGRAM_CREDENTIALS.instagramAccountId);
}

/**
 * Get configuration status for all platforms
 */
export function getConfigurationStatus(): Record<string, boolean> {
    return {
        twitter: isTwitterConfigured(),
        linkedin: isLinkedInConfigured(),
        instagram: isInstagramConfigured(),
    };
}
