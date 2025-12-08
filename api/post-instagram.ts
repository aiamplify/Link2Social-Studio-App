import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'https';

// Instagram credentials
const INSTAGRAM_CREDENTIALS = {
    accessToken: 'EAAoLa0r1ya8BQO3vVOmT4wM8XEWYf22M4zFcOvMrDisUv63Ap3XDz4IeWdUwUBAMICJPs5ZADf7ZASJiq6hFV12sNtl3ADIHFqlA01ZCNnp457sPuvxKb0pZAdJYVl6CV2ZCaBkImkZCCPXdR82nFH0GdUbRezgBZB5bZBJDCf1RtqZAUzXItesR0RyNeru0L0zZBXhesZD',
    instagramAccountId: '17841460156952672',
};

// ImgBB API for hosting images (free tier)
const IMGBB_API_KEY = '74b6c0a4993129181bf3413ee86029e2';

/**
 * Make HTTPS request (consistent with other API routes)
 */
function makeRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: string
): Promise<{ statusCode: number; data: string }> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);

        const finalHeaders = { ...headers };
        if (body) {
            finalHeaders['Content-Length'] = Buffer.byteLength(body, 'utf8').toString();
        }

        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method,
            headers: finalHeaders,
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode || 500, data }));
        });

        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

/**
 * Upload image to ImgBB and return the URL
 */
async function uploadToImgBB(base64Image: string): Promise<string | null> {
    if (!IMGBB_API_KEY) {
        return null;
    }

    try {
        // Remove data URL prefix if present
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

        const body = `key=${IMGBB_API_KEY}&image=${encodeURIComponent(base64Data)}`;

        const response = await makeRequest(
            'https://api.imgbb.com/1/upload',
            'POST',
            {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body
        );

        console.log('ImgBB response:', response.statusCode, response.data.substring(0, 200));

        if (response.statusCode !== 200) {
            console.error('ImgBB upload failed:', response.data);
            return null;
        }

        const data = JSON.parse(response.data);
        // Use the display_url which is more reliable for Instagram
        const imageUrl = data.data?.display_url || data.data?.url;
        console.log('ImgBB image URL:', imageUrl);
        return imageUrl || null;
    } catch (error) {
        console.error('ImgBB upload error:', error);
        return null;
    }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check media container status
 */
async function checkContainerStatus(containerId: string, accessToken: string): Promise<string> {
    const url = `https://graph.facebook.com/v18.0/${containerId}?fields=status_code,status&access_token=${accessToken}`;

    const response = await makeRequest(url, 'GET', {});

    if (response.statusCode !== 200) {
        console.error('Status check failed:', response.data);
        return 'ERROR';
    }

    const data = JSON.parse(response.data);
    console.log('Container status:', data);
    return data.status_code || 'UNKNOWN';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { text, caption, images } = req.body;
        const { accessToken, instagramAccountId } = INSTAGRAM_CREDENTIALS;

        // Support both 'text' and 'caption' for flexibility
        const postCaption = caption || text;

        if (!postCaption) {
            return res.status(400).json({ error: 'Caption is required' });
        }

        if (!images || images.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Instagram requires at least one image to post.',
            });
        }

        console.log('Starting Instagram post, caption length:', postCaption.length);

        // Upload image to ImgBB
        const imageUrl = await uploadToImgBB(images[0]);

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'Failed to upload image to ImgBB. Please try again.',
            });
        }

        console.log('Image uploaded to ImgBB:', imageUrl);

        // Wait a moment for the image to be fully available
        await sleep(2000);

        // Step 1: Create media container
        const createBody = JSON.stringify({
            image_url: imageUrl,
            caption: postCaption,
            access_token: accessToken,
        });

        console.log('Creating Instagram media container...');

        const createResponse = await makeRequest(
            `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
            'POST',
            {
                'Content-Type': 'application/json',
            },
            createBody
        );

        console.log('Create container response:', createResponse.statusCode, createResponse.data);

        if (createResponse.statusCode !== 200) {
            const errorData = JSON.parse(createResponse.data);
            return res.status(createResponse.statusCode).json({
                success: false,
                message: errorData.error?.message || 'Failed to create Instagram media container',
            });
        }

        const mediaData = JSON.parse(createResponse.data);
        const containerId = mediaData.id;

        console.log('Container created:', containerId);

        // Step 2: Wait for container to be ready (poll status)
        let status = 'IN_PROGRESS';
        let attempts = 0;
        const maxAttempts = 30; // Max 30 seconds

        while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
            await sleep(1000);
            status = await checkContainerStatus(containerId, accessToken);
            attempts++;
            console.log(`Status check ${attempts}: ${status}`);
        }

        if (status !== 'FINISHED') {
            return res.status(400).json({
                success: false,
                message: `Media processing failed with status: ${status}. This may be due to image format or size issues.`,
            });
        }

        // Step 3: Publish the container
        const publishBody = JSON.stringify({
            creation_id: containerId,
            access_token: accessToken,
        });

        console.log('Publishing container...');

        const publishResponse = await makeRequest(
            `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
            'POST',
            {
                'Content-Type': 'application/json',
            },
            publishBody
        );

        console.log('Publish response:', publishResponse.statusCode, publishResponse.data);

        if (publishResponse.statusCode !== 200) {
            const errorData = JSON.parse(publishResponse.data);
            return res.status(publishResponse.statusCode).json({
                success: false,
                message: errorData.error?.message || 'Failed to publish Instagram post',
            });
        }

        const result = JSON.parse(publishResponse.data);
        return res.status(200).json({
            success: true,
            message: 'Successfully posted to Instagram!',
            postId: result.id,
        });
    } catch (error: any) {
        console.error('Instagram posting error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to post to Instagram',
        });
    }
}
