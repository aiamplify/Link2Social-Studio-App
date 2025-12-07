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
    apiKey: '',              // Also called "Consumer Key" or "API Key"
    apiKeySecret: '',        // Also called "Consumer Secret" or "API Key Secret"
    accessToken: '',         // User's Access Token
    accessTokenSecret: '',   // User's Access Token Secret
    bearerToken: '',         // Bearer Token (for app-only auth)
};

// LinkedIn API Credentials - OAuth 2.0
// Get these from: https://www.linkedin.com/developers/apps
const LINKEDIN_CREDENTIALS = {
    clientId: '',            // Application Client ID
    clientSecret: '',        // Application Client Secret
    accessToken: '',         // User's Access Token (after OAuth flow)
    personUrn: '',           // Your LinkedIn Person URN (urn:li:person:XXXXXXXX)
};

// Instagram API Credentials - Instagram Graph API (via Facebook)
// Get these from: https://developers.facebook.com/apps
const INSTAGRAM_CREDENTIALS = {
    accessToken: '',         // Long-lived User Access Token
    instagramAccountId: '',  // Instagram Business/Creator Account ID
    facebookPageId: '',      // Connected Facebook Page ID
};

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
// TWITTER POSTING
// =============================================================================

/**
 * Posts content to Twitter (X)
 * Uses OAuth 1.0a for user context posting
 *
 * For posting with images, Twitter requires:
 * 1. Upload media to media.twitter.com/1.1/media/upload.json
 * 2. Get media_id from response
 * 3. Include media_ids in the tweet creation request
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
        const mediaIds: string[] = [];

        // Step 1: Upload images if provided
        for (const imageBase64 of images.slice(0, 4)) { // Twitter allows max 4 images
            const mediaUploadResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
                method: 'POST',
                headers: {
                    'Authorization': generateTwitterOAuth1Header(
                        'POST',
                        'https://upload.twitter.com/1.1/media/upload.json',
                        { media_data: imageBase64 },
                        apiKey,
                        apiKeySecret,
                        accessToken,
                        accessTokenSecret
                    ),
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `media_data=${encodeURIComponent(imageBase64)}`,
            });

            if (!mediaUploadResponse.ok) {
                const errorText = await mediaUploadResponse.text();
                console.error('Twitter media upload failed:', errorText);
                // Continue without this image
                continue;
            }

            const mediaData = await mediaUploadResponse.json();
            if (mediaData.media_id_string) {
                mediaIds.push(mediaData.media_id_string);
            }
        }

        // Step 2: Create the tweet
        const tweetData: any = { text };
        if (mediaIds.length > 0) {
            tweetData.media = { media_ids: mediaIds };
        }

        const response = await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
                'Authorization': generateTwitterOAuth1Header(
                    'POST',
                    'https://api.twitter.com/2/tweets',
                    {},
                    apiKey,
                    apiKeySecret,
                    accessToken,
                    accessTokenSecret
                ),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tweetData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.title || 'Failed to post tweet');
        }

        const result = await response.json();
        return {
            success: true,
            message: 'Successfully posted to Twitter!',
            postId: result.data?.id,
            postUrl: result.data?.id ? `https://twitter.com/i/web/status/${result.data.id}` : undefined,
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
 * Posts content to LinkedIn
 * Uses OAuth 2.0 with UGC Posts API
 *
 * For posting with images, LinkedIn requires:
 * 1. Register upload via /assets?action=registerUpload
 * 2. Upload image to the provided URL
 * 3. Include the asset URN in the post
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
        const mediaAssets: string[] = [];

        // Step 1: Upload images if provided
        for (const imageBase64 of images.slice(0, 9)) { // LinkedIn allows up to 9 images
            // Register upload
            const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0',
                },
                body: JSON.stringify({
                    registerUploadRequest: {
                        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                        owner: personUrn,
                        serviceRelationships: [{
                            relationshipType: 'OWNER',
                            identifier: 'urn:li:userGeneratedContent',
                        }],
                    },
                }),
            });

            if (!registerResponse.ok) {
                console.error('LinkedIn register upload failed:', await registerResponse.text());
                continue;
            }

            const registerData = await registerResponse.json();
            const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
            const asset = registerData.value?.asset;

            if (!uploadUrl || !asset) {
                continue;
            }

            // Upload the image
            const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'image/png',
                },
                body: imageBuffer,
            });

            if (uploadResponse.ok) {
                mediaAssets.push(asset);
            }
        }

        // Step 2: Create the post
        const postData: any = {
            author: personUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                        text: text,
                    },
                    shareMediaCategory: mediaAssets.length > 0 ? 'IMAGE' : 'NONE',
                },
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
        };

        // Add media if uploaded
        if (mediaAssets.length > 0) {
            postData.specificContent['com.linkedin.ugc.ShareContent'].media = mediaAssets.map(asset => ({
                status: 'READY',
                media: asset,
            }));
        }

        const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create LinkedIn post');
        }

        const result = await response.json();
        return {
            success: true,
            message: 'Successfully posted to LinkedIn!',
            postId: result.id,
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
 * For carousel posts, Instagram requires:
 * 1. Create container for each image
 * 2. Create carousel container with children
 * 3. Publish the carousel container
 *
 * Note: Images must be accessible via public URL for Instagram API
 * We'll upload to a temporary hosting or use data URLs where supported
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
        // Instagram Graph API requires images to be hosted on a public URL
        // For now, we'll return an error if trying to post base64 images directly
        // You would need to:
        // 1. Upload images to a hosting service (S3, Cloudinary, etc.)
        // 2. Get the public URLs
        // 3. Use those URLs in the API calls

        if (images.length === 0) {
            return {
                success: false,
                message: 'Instagram requires at least one image to post. Please include images.',
            };
        }

        // For a single image post
        if (images.length === 1) {
            // Note: In production, you would need to upload the image to a public URL first
            // This is a placeholder showing the API structure

            const createMediaResponse = await fetch(
                `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        // image_url: 'PUBLIC_URL_HERE', // Requires public URL
                        caption: caption,
                        access_token: accessToken,
                    }),
                }
            );

            if (!createMediaResponse.ok) {
                const errorData = await createMediaResponse.json();
                throw new Error(
                    errorData.error?.message ||
                    'Instagram requires images to be hosted on a public URL. Please upload images to a hosting service first.'
                );
            }

            const mediaData = await createMediaResponse.json();
            const containerId = mediaData.id;

            // Publish the container
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
        }

        // For carousel (multiple images)
        // Step 1: Create container for each image
        const childContainers: string[] = [];

        for (const _imageBase64 of images.slice(0, 10)) { // Instagram allows max 10 images in carousel
            // Note: Each image needs to be hosted on a public URL
            // This would need to be implemented with an image hosting solution

            // Placeholder - in production, upload image and get URL first
            return {
                success: false,
                message: 'Instagram carousel posting requires images to be hosted on a public URL. Please implement image hosting (e.g., Cloudinary, S3) for carousel support.',
            };
        }

        // Step 2: Create carousel container
        const carouselResponse = await fetch(
            `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    media_type: 'CAROUSEL',
                    children: childContainers.join(','),
                    caption: caption,
                    access_token: accessToken,
                }),
            }
        );

        if (!carouselResponse.ok) {
            const errorData = await carouselResponse.json();
            throw new Error(errorData.error?.message || 'Failed to create Instagram carousel');
        }

        const carouselData = await carouselResponse.json();

        // Step 3: Publish the carousel
        const publishResponse = await fetch(
            `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    creation_id: carouselData.id,
                    access_token: accessToken,
                }),
            }
        );

        if (!publishResponse.ok) {
            const errorData = await publishResponse.json();
            throw new Error(errorData.error?.message || 'Failed to publish Instagram carousel');
        }

        const result = await publishResponse.json();
        return {
            success: true,
            message: 'Successfully posted carousel to Instagram!',
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
 * This is a simplified version - in production, use a proper OAuth library
 */
function generateTwitterOAuth1Header(
    method: string,
    url: string,
    params: Record<string, string>,
    apiKey: string,
    apiKeySecret: string,
    accessToken: string,
    accessTokenSecret: string
): string {
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

    // Generate signature using HMAC-SHA1
    const signature = generateHmacSha1Signature(signatureBase, signingKey);

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
 * Generates HMAC-SHA1 signature
 * Note: In a browser environment, you'll need to use the Web Crypto API
 */
async function generateHmacSha1Signature(data: string, key: string): Promise<string> {
    // Using Web Crypto API for browser compatibility
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
