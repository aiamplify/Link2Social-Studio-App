import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { Readable } from 'stream';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Google Drive folder ID extracted from the shared link
// https://drive.google.com/drive/folders/1JwZpIeObLGltjseDpQowm7mDmhlveCPf
const GOOGLE_DRIVE_FOLDER_ID = '1JwZpIeObLGltjseDpQowm7mDmhlveCPf';

// Google Sheets ID extracted from the shared link
// https://docs.google.com/spreadsheets/d/1jMk9ARf0kj7EJ-1ds-RuU92cG_1W7WaNx6TdYJvU-aU
const GOOGLE_SHEET_ID = '1jMk9ARf0kj7EJ-1ds-RuU92cG_1W7WaNx6TdYJvU-aU';

// Sheet name (first sheet by default)
const SHEET_NAME = 'Sheet1';

// =============================================================================
// GOOGLE AUTH SETUP
// =============================================================================

/**
 * Creates a Google Auth client using service account credentials
 * Credentials should be stored in environment variables
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
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/spreadsheets',
        ],
    });

    return auth;
}

// =============================================================================
// GOOGLE DRIVE FUNCTIONS
// =============================================================================

/**
 * Uploads an image to Google Drive and returns the shareable link
 */
async function uploadImageToDrive(
    imageBase64: string,
    fileName: string
): Promise<string> {
    const auth = getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Create a readable stream from the buffer
    const stream = new Readable();
    stream.push(imageBuffer);
    stream.push(null);

    // Upload file to Google Drive
    const fileMetadata = {
        name: fileName,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
    };

    const media = {
        mimeType: 'image/png',
        body: stream,
    };

    const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
    });

    const fileId = response.data.id;

    if (!fileId) {
        throw new Error('Failed to get file ID from Google Drive upload');
    }

    // Make the file publicly accessible (or at least viewable with link)
    await drive.permissions.create({
        fileId: fileId,
        requestBody: {
            role: 'reader',
            type: 'anyone',
        },
    });

    // Get the shareable link
    const fileLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

    return fileLink;
}

// =============================================================================
// GOOGLE SHEETS FUNCTIONS
// =============================================================================

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

    // Append the row data
    // Column order: Title, Media URL, Caption, Status
    const values = [[title, mediaUrl, caption, status]];

    const response = await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${SHEET_NAME}!A:D`,
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
                driveFolderId: GOOGLE_DRIVE_FOLDER_ID,
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

        // Generate filename with timestamp and platform
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `social_post_${platform}_${timestamp}.png`;

        // 1. Upload image to Google Drive
        console.log('Uploading image to Google Drive...');
        const driveFileUrl = await uploadImageToDrive(imageBase64, fileName);
        console.log('Image uploaded:', driveFileUrl);

        // 2. Prepare the caption with hashtags if provided
        const fullCaption = hashtags ? `${caption}\n\n${hashtags}` : caption;

        // 3. Create title - use platform and truncated caption
        const postTitle = title || `${platform} Post - ${caption.substring(0, 50)}${caption.length > 50 ? '...' : ''}`;

        // 4. Append row to Google Sheet
        console.log('Appending row to Google Sheet...');
        const rowNumber = await appendRowToSheet(
            postTitle,
            driveFileUrl,
            fullCaption,
            status || 'Ready to Post'
        );
        console.log('Row added at:', rowNumber);

        return res.status(200).json({
            success: true,
            message: `Successfully exported to Google Sheets (Row ${rowNumber})`,
            driveFileUrl,
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
