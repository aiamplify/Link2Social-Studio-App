import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import https from 'https';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Google Sheets ID extracted from the shared link
// https://docs.google.com/spreadsheets/d/1jMk9ARf0kj7EJ-1ds-RuU92cG_1W7WaNx6TdYJvU-aU
const GOOGLE_SHEET_ID = '1jMk9ARf0kj7EJ-1ds-RuU92cG_1W7WaNx6TdYJvU-aU';

// ImgBB API for hosting images (same as Instagram integration)
const IMGBB_API_KEY = '74b6c0a4993129181bf3413ee86029e2';

// =============================================================================
// HTTPS REQUEST HELPER
// =============================================================================

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

// =============================================================================
// IMGBB IMAGE UPLOAD
// =============================================================================

/**
 * Upload image to ImgBB and return the URL
 * This avoids the Google Drive service account storage quota issue
 */
async function uploadToImgBB(base64Image: string): Promise<string | null> {
    if (!IMGBB_API_KEY) {
        throw new Error('ImgBB API key not configured');
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

        console.log('ImgBB response:', response.statusCode);

        if (response.statusCode !== 200) {
            console.error('ImgBB upload failed:', response.data);
            throw new Error('Failed to upload image to ImgBB');
        }

        const data = JSON.parse(response.data);
        // Use the display_url which is more reliable
        const imageUrl = data.data?.display_url || data.data?.url;
        console.log('ImgBB image URL:', imageUrl);
        return imageUrl || null;
    } catch (error) {
        console.error('ImgBB upload error:', error);
        throw error;
    }
}

// =============================================================================
// GOOGLE AUTH SETUP
// =============================================================================

/**
 * Creates a Google Auth client using service account credentials
 * Only needs Sheets scope now (no Drive needed)
 */
function getGoogleAuthClient() {
    // Service account credentials from environment variables
    const credentials = {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.GOOGLE_CERT_URL,
    };

    // Verify required credentials exist
    if (!credentials.private_key || !credentials.client_email) {
        throw new Error('Google service account credentials not configured');
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
        ],
    });

    return auth;
}

// =============================================================================
// GOOGLE SHEETS FUNCTIONS
// =============================================================================

/**
 * Gets the name of the first sheet in the spreadsheet
 */
async function getFirstSheetName(auth: any): Promise<string> {
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        fields: 'sheets.properties.title',
    });

    const firstSheet = response.data.sheets?.[0];
    if (!firstSheet?.properties?.title) {
        throw new Error('Could not find any sheets in the spreadsheet');
    }

    return firstSheet.properties.title;
}

/**
 * Appends a row to the Google Sheet with the post data
 */
async function appendRowToSheet(
    title: string,
    mediaUrl: string,
    caption: string,
    status: string = 'Ready to Post'
): Promise<number> {
    const auth = getGoogleAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Get the actual first sheet name (might not be "Sheet1")
    const sheetName = await getFirstSheetName(auth);
    console.log('Using sheet:', sheetName);

    // Append the row data
    // Column order: Title, Media URL, Caption, Status
    const values = [[title, mediaUrl, caption, status]];

    const response = await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `'${sheetName}'!A:D`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values,
        },
    });

    // Extract the row number from the updated range
    const updatedRange = response.data.updates?.updatedRange || '';
    const match = updatedRange.match(/:D(\d+)$/);
    const rowNumber = match ? parseInt(match[1], 10) : 0;

    return rowNumber;
}

// =============================================================================
// API HANDLER
// =============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Handle status check
    if (req.method === 'GET') {
        try {
            // Check if credentials are configured
            const hasCredentials = !!(
                process.env.GOOGLE_PRIVATE_KEY &&
                process.env.GOOGLE_CLIENT_EMAIL
            );

            return res.status(200).json({
                configured: hasCredentials,
                sheetId: GOOGLE_SHEET_ID,
            });
        } catch (error) {
            return res.status(200).json({ configured: false });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { title, caption, hashtags, platform, imageBase64, status } = req.body as {
            title: string;
            caption: string;
            hashtags?: string;
            platform: string;
            imageBase64: string;
            status?: string;
        };

        // Validate required fields
        if (!imageBase64) {
            return res.status(400).json({
                success: false,
                message: 'No image provided',
            });
        }

        if (!caption) {
            return res.status(400).json({
                success: false,
                message: 'No caption provided',
            });
        }

        // 1. Upload image to ImgBB (instead of Google Drive)
        console.log('Uploading image to ImgBB...');
        const imageUrl = await uploadToImgBB(imageBase64);

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'Failed to upload image. Please try again.',
            });
        }
        console.log('Image uploaded:', imageUrl);

        // 2. Prepare the caption with hashtags if provided
        const fullCaption = hashtags ? `${caption}\n\n${hashtags}` : caption;

        // 3. Create title - use platform and truncated caption
        const postTitle = title || `${platform} Post - ${caption.substring(0, 50)}${caption.length > 50 ? '...' : ''}`;

        // 4. Append row to Google Sheet
        console.log('Appending row to Google Sheet...');
        const rowNumber = await appendRowToSheet(
            postTitle,
            imageUrl,
            fullCaption,
            status || 'Ready to Post'
        );
        console.log('Row added at:', rowNumber);

        return res.status(200).json({
            success: true,
            message: `Successfully exported to Google Sheets (Row ${rowNumber})`,
            driveFileUrl: imageUrl, // Return ImgBB URL (kept same field name for compatibility)
            sheetRowNumber: rowNumber,
        });
    } catch (error) {
        console.error('Error exporting to Google Sheets:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
