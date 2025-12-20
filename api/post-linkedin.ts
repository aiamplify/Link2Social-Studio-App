import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'https';

/**
 * DEPRECATED: Direct LinkedIn posting is deprecated.
 * All posting should now go through Blotato API.
 * This file is kept for backwards compatibility.
 *
 * LinkedIn credentials should be stored in environment variables:
 * - LINKEDIN_CLIENT_ID
 * - LINKEDIN_CLIENT_SECRET
 * - LINKEDIN_ACCESS_TOKEN
 */
const LINKEDIN_CREDENTIALS = {
  clientId: process.env.LINKEDIN_CLIENT_ID || '',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
  accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
};

// Cache for person URN (LinkedIn user ID)
let cachedPersonUrn: string | null = null;

/**
 * Make HTTPS request
 */
function makeRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    // If there's a body, set Content-Length to prevent chunked encoding issues
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
 * Get the LinkedIn person URN (user ID)
 * Tries multiple endpoints as different app types use different endpoints
 */
async function getPersonUrn(): Promise<string> {
  if (cachedPersonUrn) return cachedPersonUrn;

  // Try /v2/userinfo first (OpenID Connect)
  console.log('Trying /v2/userinfo endpoint...');
  let response = await makeRequest(
    'https://api.linkedin.com/v2/userinfo',
    'GET',
    {
      'Authorization': `Bearer ${LINKEDIN_CREDENTIALS.accessToken}`,
    }
  );

  if (response.statusCode === 200) {
    const profile = JSON.parse(response.data);
    cachedPersonUrn = `urn:li:person:${profile.sub}`;
    console.log('Got person URN from userinfo:', cachedPersonUrn);
    return cachedPersonUrn;
  }

  console.log('userinfo failed, trying /v2/me endpoint...', response.statusCode, response.data);

  // Fallback to /v2/me (older API)
  response = await makeRequest(
    'https://api.linkedin.com/v2/me',
    'GET',
    {
      'Authorization': `Bearer ${LINKEDIN_CREDENTIALS.accessToken}`,
    }
  );

  if (response.statusCode === 200) {
    const profile = JSON.parse(response.data);
    cachedPersonUrn = `urn:li:person:${profile.id}`;
    console.log('Got person URN from /v2/me:', cachedPersonUrn);
    return cachedPersonUrn;
  }

  console.error('Both endpoints failed:', response.statusCode, response.data);
  throw new Error(`Failed to get LinkedIn profile. Status: ${response.statusCode}. Response: ${response.data}`);
}

/**
 * Register an image upload to LinkedIn using v2 assets API
 */
async function initializeImageUpload(personUrn: string): Promise<{ uploadUrl: string; asset: string }> {
  const body = JSON.stringify({
    registerUploadRequest: {
      recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
      owner: personUrn,
      serviceRelationships: [
        {
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        },
      ],
    },
  });

  console.log('Initializing LinkedIn image upload...');

  const response = await makeRequest(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    'POST',
    {
      'Authorization': `Bearer ${LINKEDIN_CREDENTIALS.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body
  );

  console.log('Initialize upload response:', response.statusCode, response.data);

  if (response.statusCode !== 200) {
    console.error('Initialize upload failed:', response.data);
    throw new Error(`Failed to initialize LinkedIn image upload: ${response.data}`);
  }

  const result = JSON.parse(response.data);
  const uploadMechanism = result.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'];

  return {
    uploadUrl: uploadMechanism.uploadUrl,
    asset: result.value.asset,
  };
}

/**
 * Upload image binary to LinkedIn
 */
async function uploadImageBinary(uploadUrl: string, imageBase64: string): Promise<void> {
  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  const urlObj = new URL(uploadUrl);

  console.log('Uploading image to LinkedIn, size:', imageBuffer.length);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINKEDIN_CREDENTIALS.accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': imageBuffer.length.toString(),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Image upload response:', res.statusCode, data);
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Image upload failed: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(imageBuffer);
    req.end();
  });
}

/**
 * Create a LinkedIn post with images using UGC Posts API
 */
async function createPost(personUrn: string, text: string, imageAssets: string[]): Promise<string> {
  // Use the v2 UGC Posts API which is more reliable
  const mediaArray = imageAssets.map(asset => ({
    status: 'READY',
    media: asset,
  }));

  const body = JSON.stringify({
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: text,
        },
        shareMediaCategory: imageAssets.length > 0 ? 'IMAGE' : 'NONE',
        media: mediaArray,
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  });

  console.log('Creating LinkedIn post with body:', body);

  const response = await makeRequest(
    'https://api.linkedin.com/v2/ugcPosts',
    'POST',
    {
      'Authorization': `Bearer ${LINKEDIN_CREDENTIALS.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body
  );

  console.log('LinkedIn post response:', response.statusCode, response.data);

  if (response.statusCode !== 201 && response.statusCode !== 200) {
    console.error('Post creation failed:', response.data);
    throw new Error(`Failed to create LinkedIn post: ${response.data}`);
  }

  // Extract post ID from response
  const result = JSON.parse(response.data);
  return result.id || 'unknown';
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
    const { text, images, caption } = req.body as { text?: string; images?: string[]; caption?: string };

    // Support both 'text' and 'caption' for flexibility
    const postText = text || caption;

    if (!postText || typeof postText !== 'string') {
      return res.status(400).json({ error: 'No text/caption provided' });
    }

    // Get person URN
    const personUrn = await getPersonUrn();

    // Upload images if provided (LinkedIn allows up to 20 images per post)
    const imageAssets: string[] = [];
    if (images && Array.isArray(images) && images.length > 0) {
      const imagesToUpload = images.slice(0, 9); // Keep it reasonable
      for (const image of imagesToUpload) {
        try {
          // Initialize upload
          const { uploadUrl, asset } = await initializeImageUpload(personUrn);

          // Upload the image binary
          await uploadImageBinary(uploadUrl, image);

          imageAssets.push(asset);
        } catch (error) {
          console.error('Failed to upload image to LinkedIn:', error);
          // Continue with other images
        }
      }
    }

    // Create the post (with or without images)
    const postId = await createPost(personUrn, postText, imageAssets);

    return res.status(200).json({
      success: true,
      message: 'Successfully posted to LinkedIn!',
      postId: postId,
      postUrl: `https://www.linkedin.com/feed/update/${postId}`,
    });
  } catch (error) {
    console.error('Error posting to LinkedIn:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
}
