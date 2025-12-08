import type { VercelRequest, VercelResponse } from '@vercel/node';

// Instagram credentials - in production, use environment variables
const INSTAGRAM_CREDENTIALS = {
    accessToken: 'EAAoLa0r1ya8BQO3vVOmT4wM8XEWYf22M4zFcOvMrDisUv63Ap3XDz4IeWdUwUBAMICJPs5ZADf7ZASJiq6hFV12sNtl3ADIHFqlA01ZCNnp457sPuvxKb0pZAdJYVl6CV2ZCaBkImkZCCPXdR82nFH0GdUbRezgBZB5bZBJDCf1RtqZAUzXItesR0RyNeru0L0zZBXhesZD',
    instagramAccountId: '17841460156952672',
};

// ImgBB API for hosting images
const IMGBB_API_KEY = ''; // Add your ImgBB API key here

async function uploadToImgBB(base64Image: string): Promise<string | null> {
    if (!IMGBB_API_KEY) {
        return null;
    }

    try {
        const formData = new URLSearchParams();
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
        const { caption, images } = req.body;
        const { accessToken, instagramAccountId } = INSTAGRAM_CREDENTIALS;

        if (!caption) {
            return res.status(400).json({ error: 'Caption is required' });
        }

        if (!images || images.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Instagram requires at least one image to post.',
            });
        }

        // Try to upload image to ImgBB
        let imageUrl: string | null = null;
        if (IMGBB_API_KEY) {
            imageUrl = await uploadToImgBB(images[0]);
        }

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'Instagram requires images hosted on a public URL. Please add an ImgBB API key to api/post-instagram.ts (get one free at https://api.imgbb.com/)',
            });
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
            return res.status(createMediaResponse.status).json({
                success: false,
                message: errorData.error?.message || 'Failed to create Instagram media container',
            });
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
            return res.status(publishResponse.status).json({
                success: false,
                message: errorData.error?.message || 'Failed to publish Instagram post',
            });
        }

        const result = await publishResponse.json();
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
