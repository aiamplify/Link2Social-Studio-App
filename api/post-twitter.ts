import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import https from 'https';

// Twitter credentials from environment variables
const TWITTER_CREDENTIALS = {
  apiKey: process.env.TWITTER_API_KEY || '',
  apiSecret: process.env.TWITTER_API_SECRET || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
};

interface TwitterMediaUploadResponse {
  media_id_string: string;
}

/**
 * Generate OAuth 1.0a signature
 */
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
  };

  // Combine all parameters
  const allParams = { ...params, ...oauthParams };

  // Sort and encode parameters
  const sortedParams = Object.keys(allParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
    .join('&');

  // Create signature base string
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  // Create signing key
  const signingKey = `${encodeURIComponent(TWITTER_CREDENTIALS.apiSecret)}&${encodeURIComponent(TWITTER_CREDENTIALS.accessTokenSecret)}`;

  // Generate HMAC-SHA1 signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  // Add signature to oauth params
  oauthParams['oauth_signature'] = signature;

  // Build OAuth header
  const oauthHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return oauthHeader;
}

/**
 * Make HTTPS request
 */
function makeRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string | Buffer
): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers,
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
 * Upload media to Twitter (simple single-request upload for small images)
 */
async function uploadMedia(imageBase64: string): Promise<string> {
  const url = 'https://upload.twitter.com/1.1/media/upload.json';

  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const params = {
    media_data: base64Data,
  };

  const auth = generateOAuthSignature('POST', url, params);
  const body = `media_data=${encodeURIComponent(base64Data)}`;

  const response = await makeRequest(url, 'POST', {
    'Authorization': auth,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body).toString(),
  }, body);

  if (response.statusCode !== 200) {
    console.error('Media upload failed - Status:', response.statusCode);
    console.error('Media upload failed - Response:', response.data);
    throw new Error(`Media upload failed (HTTP ${response.statusCode}): ${response.data}`);
  }

  const result = JSON.parse(response.data) as TwitterMediaUploadResponse;
  return result.media_id_string;
}

/**
 * Post tweet with media
 */
async function postTweet(text: string, mediaIds: string[]): Promise<{ id: string }> {
  const url = 'https://api.twitter.com/2/tweets';

  const body: Record<string, unknown> = { text };
  if (mediaIds.length > 0) {
    body.media = { media_ids: mediaIds };
  }

  const auth = generateOAuthSignature('POST', url, {});
  const bodyStr = JSON.stringify(body);

  const response = await makeRequest(url, 'POST', {
    'Authorization': auth,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(bodyStr).toString(),
  }, bodyStr);

  if (response.statusCode !== 201 && response.statusCode !== 200) {
    console.error('Tweet posting failed - Status:', response.statusCode);
    console.error('Tweet posting failed - Response:', response.data);

    // Parse and extract detailed error info
    let errorDetail = response.data;
    try {
      const errorJson = JSON.parse(response.data);
      errorDetail = JSON.stringify(errorJson, null, 2);
      console.error('Tweet posting failed - Parsed error:', errorJson);
    } catch {
      // Response wasn't JSON, use as-is
    }

    throw new Error(`Tweet posting failed (HTTP ${response.statusCode}): ${errorDetail}`);
  }

  const result = JSON.parse(response.data);
  return { id: result.data.id };
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
    // Validate credentials are configured
    if (!TWITTER_CREDENTIALS.apiKey || !TWITTER_CREDENTIALS.apiSecret ||
        !TWITTER_CREDENTIALS.accessToken || !TWITTER_CREDENTIALS.accessTokenSecret) {
      return res.status(500).json({
        success: false,
        message: 'Twitter credentials not configured. Please set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_TOKEN_SECRET environment variables.'
      });
    }

    // Log credential status (masked for security)
    console.log('Twitter credentials loaded:', {
      apiKey: TWITTER_CREDENTIALS.apiKey.substring(0, 5) + '...',
      accessToken: TWITTER_CREDENTIALS.accessToken.substring(0, 10) + '...',
    });

    const { text, images, caption } = req.body as { text?: string; images?: string[]; caption?: string };

    // Support both 'text' and 'caption' for flexibility
    const tweetText = text || caption;

    if (!tweetText || typeof tweetText !== 'string') {
      return res.status(400).json({ error: 'No text/caption provided' });
    }

    // Upload images if provided (max 4)
    const mediaIds: string[] = [];
    if (images && Array.isArray(images) && images.length > 0) {
      const imagesToUpload = images.slice(0, 4);
      for (const image of imagesToUpload) {
        try {
          const mediaId = await uploadMedia(image);
          mediaIds.push(mediaId);
        } catch (error) {
          console.error('Failed to upload image:', error);
          // Continue with other images
        }
      }
    }

    // Post tweet
    const tweet = await postTweet(tweetText, mediaIds);

    return res.status(200).json({
      success: true,
      message: 'Successfully posted to Twitter!',
      postId: tweet.id,
      postUrl: `https://twitter.com/i/status/${tweet.id}`,
    });
  } catch (error) {
    console.error('Error posting to Twitter:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
