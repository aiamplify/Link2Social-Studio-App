import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// Twitter credentials - in production, use environment variables
const TWITTER_CREDENTIALS = {
    apiKey: 'ad9Nxpyud2BBcxs6JKl6DjMWd',
    apiKeySecret: 'kOprhIQtyjAcr3sxrNzuZHP1F3Bdr0D1toCAk894GhI4NX1Bm6',
    accessToken: '1759762781132267520-2Vtr7pXY2xjyxCddMXzMe9EMchjwBP',
    accessTokenSecret: 'D3ELzBIIuOQYpqoBDzbiLY5jdWX4hontlMWS3DCyovtyl',
};

function generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
}

function generateOAuthSignature(
    method: string,
    url: string,
    params: Record<string, string>,
    consumerSecret: string,
    tokenSecret: string
): string {
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

    const signatureBase = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

    return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

function generateOAuthHeader(method: string, url: string): string {
    const { apiKey, apiKeySecret, accessToken, accessTokenSecret } = TWITTER_CREDENTIALS;

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

    const signature = generateOAuthSignature(method, url, oauthParams, apiKeySecret, accessTokenSecret);
    oauthParams.oauth_signature = signature;

    const authHeader = Object.entries(oauthParams)
        .map(([key, value]) => `${encodeURIComponent(key)}="${encodeURIComponent(value)}"`)
        .join(', ');

    return `OAuth ${authHeader}`;
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
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const url = 'https://api.twitter.com/2/tweets';
        const authHeader = generateOAuthHeader('POST', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Twitter API error:', data);
            return res.status(response.status).json({
                success: false,
                message: data.detail || data.title || data.errors?.[0]?.message || 'Failed to post tweet',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Successfully posted to Twitter!',
            postId: data.data?.id,
            postUrl: data.data?.id ? `https://twitter.com/i/web/status/${data.data.id}` : undefined,
        });
    } catch (error: any) {
        console.error('Twitter posting error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to post to Twitter',
        });
    }
}
