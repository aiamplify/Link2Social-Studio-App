/**
 * Blotato Accounts API Route
 *
 * Lists connected social media accounts from Blotato.
 * Use this to get account IDs for scheduling posts.
 *
 * API Documentation: https://help.blotato.com/api/api-reference/openapi-reference/accounts-1
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Blotato API configuration
const BLOTATO_API_URL = process.env.BLOTATO_API_URL || 'https://backend.blotato.com/v2';
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check for API key
    if (!BLOTATO_API_KEY) {
        console.error('Blotato API key not configured');
        return res.status(500).json({
            success: false,
            message: 'Blotato API key not configured. Please add BLOTATO_API_KEY to your environment variables.'
        });
    }

    try {
        const { platform } = req.query;

        console.log(`Fetching Blotato accounts${platform ? ` for platform: ${platform}` : ''}`);

        // Build URL with optional platform filter
        let url = `${BLOTATO_API_URL}/users/me/accounts`;
        if (platform && typeof platform === 'string') {
            url += `?platform=${platform}`;
        }

        // Make request to Blotato API v2
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'blotato-api-key': BLOTATO_API_KEY,
                'Content-Type': 'application/json',
            }
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Blotato accounts error:', responseData);
            return res.status(response.status).json({
                success: false,
                message: responseData.message || responseData.error || 'Failed to fetch accounts',
                details: responseData
            });
        }

        // Format accounts for easier use
        const accounts = (responseData.accounts || responseData || []).map((acc: any) => ({
            id: acc.id || acc.accountId,
            platform: acc.platform || acc.type,
            name: acc.name || acc.displayName || acc.username,
            username: acc.username || acc.handle,
            connected: acc.connected !== false,
            // Include any subaccounts (e.g., Facebook Pages)
            subaccounts: acc.subaccounts || acc.pages || []
        }));

        console.log(`Found ${accounts.length} Blotato accounts`);

        return res.status(200).json({
            success: true,
            accounts: accounts,
            // Also provide env var format for easy copy-paste
            envVars: accounts.reduce((acc: Record<string, string>, account: any) => {
                const envKey = `BLOTATO_${account.platform.toUpperCase()}_ACCOUNT_ID`;
                acc[envKey] = account.id;
                return acc;
            }, {})
        });

    } catch (error: unknown) {
        console.error('Blotato accounts error:', error);

        let errorMessage = 'Unknown error occurred';
        if (error instanceof Error) {
            if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
                errorMessage = 'Unable to connect to Blotato API. Please check your API key.';
            } else {
                errorMessage = error.message;
            }
        }

        return res.status(500).json({
            success: false,
            message: `Failed to fetch accounts: ${errorMessage}`
        });
    }
}
