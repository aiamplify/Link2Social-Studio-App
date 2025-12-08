/**
 * Social Media Posting Service
 *
 * This service handles posting content to Twitter, LinkedIn, and Instagram
 * by calling serverless API routes that handle the actual API communication.
 */

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
// API BASE URL
// =============================================================================

// In development, Vite dev server proxies /api to Vercel functions
// In production, /api routes are handled by Vercel
const API_BASE = '/api';

// =============================================================================
// TWITTER POSTING
// =============================================================================

/**
 * Posts content to Twitter via serverless API
 */
export async function postToTwitter(text: string, images: string[] = []): Promise<PostResult> {
    try {
        const response = await fetch(`${API_BASE}/post-twitter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, images }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || data.error || 'Failed to post to Twitter',
            };
        }

        return data;
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
 * Posts content to LinkedIn via serverless API
 */
export async function postToLinkedIn(text: string, images: string[] = []): Promise<PostResult> {
    try {
        const response = await fetch(`${API_BASE}/post-linkedin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, images }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || data.error || 'Failed to post to LinkedIn',
            };
        }

        return data;
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
 * Posts content to Instagram via serverless API
 */
export async function postToInstagram(caption: string, images: string[] = []): Promise<PostResult> {
    try {
        const response = await fetch(`${API_BASE}/post-instagram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ caption, images }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || data.error || 'Failed to post to Instagram',
            };
        }

        return data;
    } catch (error: any) {
        console.error('Instagram posting error:', error);
        return {
            success: false,
            message: error.message || 'Failed to post to Instagram',
        };
    }
}

// =============================================================================
// CREDENTIAL VALIDATION
// =============================================================================

/**
 * Check if Twitter credentials are configured (always true when using API routes)
 */
export function isTwitterConfigured(): boolean {
    return true;
}

/**
 * Check if LinkedIn credentials are configured (always true when using API routes)
 */
export function isLinkedInConfigured(): boolean {
    return true;
}

/**
 * Check if Instagram credentials are configured (always true when using API routes)
 */
export function isInstagramConfigured(): boolean {
    return true;
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
