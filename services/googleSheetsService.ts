/**
 * Google Sheets Export Service
 *
 * This service handles:
 * 1. Uploading images to Google Drive
 * 2. Appending post data to Google Sheets
 *
 * Requires Google Service Account credentials configured in environment variables.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface GoogleSheetsExportData {
    title: string;
    caption: string;
    hashtags: string;
    platform: string;
    imageBase64: string;
    status?: string;
}

export interface GoogleSheetsExportResult {
    success: boolean;
    message: string;
    driveFileUrl?: string;
    sheetRowNumber?: number;
}

// =============================================================================
// API BASE URL
// =============================================================================

const API_BASE = '/api';

// =============================================================================
// GOOGLE SHEETS EXPORT
// =============================================================================

/**
 * Exports a social media post to Google Sheets with the image uploaded to Google Drive
 *
 * @param data - The post data to export
 * @returns Result of the export operation
 */
export async function exportToGoogleSheets(data: GoogleSheetsExportData): Promise<GoogleSheetsExportResult> {
    try {
        const response = await fetch(`${API_BASE}/export-to-sheets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: result.message || result.error || 'Failed to export to Google Sheets',
            };
        }

        return result;
    } catch (error: any) {
        console.error('Google Sheets export error:', error);
        return {
            success: false,
            message: error.message || 'Failed to export to Google Sheets',
        };
    }
}

/**
 * Exports multiple social media posts to Google Sheets
 *
 * @param posts - Array of post data to export
 * @returns Array of results for each post
 */
export async function exportMultipleToGoogleSheets(
    posts: GoogleSheetsExportData[]
): Promise<GoogleSheetsExportResult[]> {
    const results: GoogleSheetsExportResult[] = [];

    for (const post of posts) {
        const result = await exportToGoogleSheets(post);
        results.push(result);
    }

    return results;
}

/**
 * Check if Google Sheets export is configured
 * This calls the API to verify credentials are set up
 */
export async function isGoogleSheetsConfigured(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/export-to-sheets/status`, {
            method: 'GET',
        });

        if (!response.ok) return false;

        const data = await response.json();
        return data.configured === true;
    } catch {
        return false;
    }
}
