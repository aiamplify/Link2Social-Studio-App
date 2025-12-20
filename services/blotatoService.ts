/**
 * Blotato API Service
 *
 * Central service for all social media posting through the Blotato API.
 * Supports: Twitter, Facebook Pages, Instagram, LinkedIn, BlueSky, Threads, TikTok, YouTube
 *
 * All posting and scheduling is routed through Blotato for unified management.
 */

// =============================================================================
// TYPES
// =============================================================================

export type BlotatoPlatform =
    | 'twitter'
    | 'facebook'
    | 'instagram'
    | 'linkedin'
    | 'bluesky'
    | 'threads'
    | 'tiktok'
    | 'youtube';

export interface BlotatoPostData {
    caption: string;
    hashtags: string[];
    media: BlotatoMedia[];
    platforms: BlotatoPlatform[];
    scheduledAt?: Date;  // If undefined, post immediately
}

export interface BlotatoMedia {
    type: 'image' | 'video';
    data: string;  // Base64 encoded data
    mimeType?: string;
}

export interface BlotatoPostResult {
    success: boolean;
    message: string;
    blotatoPostId?: string;
    scheduledAt?: string;
    platformResults?: {
        platform: BlotatoPlatform;
        success: boolean;
        postId?: string;
        postUrl?: string;
        error?: string;
    }[];
}

export interface BlotatoScheduleResult {
    success: boolean;
    message: string;
    blotatoScheduleId?: string;
    scheduledAt?: string;
    platforms: BlotatoPlatform[];
}

// Platform configuration with display info
export interface PlatformConfig {
    id: BlotatoPlatform;
    name: string;
    color: string;
    maxCharacters?: number;
    maxImages?: number;
    supportsVideo?: boolean;
    supportsCarousel?: boolean;
}

// =============================================================================
// PLATFORM CONFIGURATIONS
// =============================================================================

export const BLOTATO_PLATFORMS: PlatformConfig[] = [
    {
        id: 'twitter',
        name: 'Twitter/X',
        color: 'sky',
        maxCharacters: 280,
        maxImages: 4,
        supportsVideo: true,
        supportsCarousel: false
    },
    {
        id: 'facebook',
        name: 'Facebook',
        color: 'blue',
        maxCharacters: 63206,
        maxImages: 10,
        supportsVideo: true,
        supportsCarousel: true
    },
    {
        id: 'instagram',
        name: 'Instagram',
        color: 'pink',
        maxCharacters: 2200,
        maxImages: 10,
        supportsVideo: true,
        supportsCarousel: true
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        color: 'indigo',
        maxCharacters: 3000,
        maxImages: 9,
        supportsVideo: true,
        supportsCarousel: true
    },
    {
        id: 'bluesky',
        name: 'BlueSky',
        color: 'cyan',
        maxCharacters: 300,
        maxImages: 4,
        supportsVideo: false,
        supportsCarousel: false
    },
    {
        id: 'threads',
        name: 'Threads',
        color: 'slate',
        maxCharacters: 500,
        maxImages: 10,
        supportsVideo: true,
        supportsCarousel: true
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        color: 'rose',
        maxCharacters: 2200,
        maxImages: 0,  // TikTok is video-only
        supportsVideo: true,
        supportsCarousel: false
    },
    {
        id: 'youtube',
        name: 'YouTube',
        color: 'red',
        maxCharacters: 5000,
        maxImages: 0,  // YouTube is video-only
        supportsVideo: true,
        supportsCarousel: false
    }
];

// =============================================================================
// API BASE URL
// =============================================================================

const API_BASE = '/api';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get platform configuration by ID
 */
export function getPlatformConfig(platformId: BlotatoPlatform): PlatformConfig | undefined {
    return BLOTATO_PLATFORMS.find(p => p.id === platformId);
}

/**
 * Get platform display name
 */
export function getBlotatoPlatformName(platform: BlotatoPlatform): string {
    const config = getPlatformConfig(platform);
    return config?.name || platform;
}

/**
 * Get platform color for UI
 */
export function getBlotatoPlatformColor(platform: BlotatoPlatform): string {
    const config = getPlatformConfig(platform);
    return config?.color || 'slate';
}

/**
 * Check if platform supports images
 */
export function platformSupportsImages(platform: BlotatoPlatform): boolean {
    const config = getPlatformConfig(platform);
    return (config?.maxImages ?? 0) > 0;
}

/**
 * Check if platform supports video
 */
export function platformSupportsVideo(platform: BlotatoPlatform): boolean {
    const config = getPlatformConfig(platform);
    return config?.supportsVideo ?? false;
}

/**
 * Check if platform supports carousels
 */
export function platformSupportsCarousel(platform: BlotatoPlatform): boolean {
    const config = getPlatformConfig(platform);
    return config?.supportsCarousel ?? false;
}

/**
 * Get max character limit for a platform
 */
export function getPlatformCharLimit(platform: BlotatoPlatform): number {
    const config = getPlatformConfig(platform);
    return config?.maxCharacters ?? 1000;
}

/**
 * Extract hashtags from content
 */
export function extractHashtags(content: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    const matches = content.match(hashtagRegex) || [];
    return matches.map(tag => tag.slice(1)); // Remove # prefix
}

/**
 * Prepare media for Blotato API
 */
function prepareMedia(images: string[], isVideo: boolean = false): BlotatoMedia[] {
    return images.map(data => ({
        type: isVideo ? 'video' : 'image',
        data: data.replace(/^data:image\/\w+;base64,/, '').replace(/^data:video\/\w+;base64,/, ''),
        mimeType: data.startsWith('data:') ? data.split(';')[0].split(':')[1] : undefined
    }));
}

// =============================================================================
// MAIN API FUNCTIONS
// =============================================================================

/**
 * Post content to social media platforms via Blotato
 * This is the main function for immediate posting
 */
export async function postToBlotato(postData: BlotatoPostData): Promise<BlotatoPostResult> {
    try {
        const response = await fetch(`${API_BASE}/blotato-post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                caption: postData.caption,
                hashtags: postData.hashtags,
                media: postData.media,
                platforms: postData.platforms,
                scheduledAt: postData.scheduledAt?.toISOString(),
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || data.error || 'Failed to post via Blotato',
            };
        }

        return data;
    } catch (error: unknown) {
        console.error('Blotato posting error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            success: false,
            message: `Blotato error: ${errorMessage}`,
        };
    }
}

/**
 * Schedule content to be posted at a specific time via Blotato
 * Blotato will handle the scheduling and posting at the specified time
 */
export async function scheduleWithBlotato(postData: BlotatoPostData): Promise<BlotatoScheduleResult> {
    if (!postData.scheduledAt) {
        return {
            success: false,
            message: 'Scheduled time is required for scheduling',
            platforms: postData.platforms
        };
    }

    try {
        const response = await fetch(`${API_BASE}/blotato-schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                caption: postData.caption,
                hashtags: postData.hashtags,
                media: postData.media,
                platforms: postData.platforms,
                scheduledAt: postData.scheduledAt.toISOString(),
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || data.error || 'Failed to schedule via Blotato',
                platforms: postData.platforms
            };
        }

        return {
            success: true,
            message: 'Successfully scheduled with Blotato',
            blotatoScheduleId: data.scheduleId,
            scheduledAt: data.scheduledAt,
            platforms: postData.platforms
        };
    } catch (error: unknown) {
        console.error('Blotato scheduling error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            success: false,
            message: `Blotato scheduling error: ${errorMessage}`,
            platforms: postData.platforms
        };
    }
}

/**
 * Cancel a scheduled post on Blotato
 */
export async function cancelBlotatoSchedule(scheduleId: string): Promise<{ success: boolean; message: string }> {
    try {
        const response = await fetch(`${API_BASE}/blotato-cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ scheduleId }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || data.error || 'Failed to cancel schedule',
            };
        }

        return {
            success: true,
            message: 'Schedule cancelled successfully',
        };
    } catch (error: unknown) {
        console.error('Blotato cancel error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            success: false,
            message: `Cancel error: ${errorMessage}`,
        };
    }
}

/**
 * Reschedule a post on Blotato
 */
export async function rescheduleBlotatoPost(
    scheduleId: string,
    newScheduledAt: Date
): Promise<BlotatoScheduleResult> {
    try {
        const response = await fetch(`${API_BASE}/blotato-reschedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                scheduleId,
                scheduledAt: newScheduledAt.toISOString(),
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || data.error || 'Failed to reschedule',
                platforms: []
            };
        }

        return {
            success: true,
            message: 'Rescheduled successfully',
            blotatoScheduleId: data.scheduleId,
            scheduledAt: data.scheduledAt,
            platforms: data.platforms || []
        };
    } catch (error: unknown) {
        console.error('Blotato reschedule error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            success: false,
            message: `Reschedule error: ${errorMessage}`,
            platforms: []
        };
    }
}

/**
 * Get status of a scheduled post from Blotato
 */
export async function getBlotatoPostStatus(scheduleId: string): Promise<{
    success: boolean;
    status?: 'scheduled' | 'posting' | 'posted' | 'failed';
    message?: string;
    platformResults?: {
        platform: BlotatoPlatform;
        status: string;
        postUrl?: string;
    }[];
}> {
    try {
        const response = await fetch(`${API_BASE}/blotato-status?scheduleId=${scheduleId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || data.error || 'Failed to get status',
            };
        }

        return {
            success: true,
            status: data.status,
            platformResults: data.platformResults,
        };
    } catch (error: unknown) {
        console.error('Blotato status error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            success: false,
            message: `Status error: ${errorMessage}`,
        };
    }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Post immediately to specified platforms
 * Convenience wrapper for postToBlotato
 */
export async function postNow(
    caption: string,
    platforms: BlotatoPlatform[],
    images: string[] = [],
    hashtags: string[] = [],
    isVideo: boolean = false
): Promise<BlotatoPostResult> {
    return postToBlotato({
        caption,
        hashtags,
        media: prepareMedia(images, isVideo),
        platforms,
    });
}

/**
 * Schedule a post for later
 * Convenience wrapper for scheduleWithBlotato
 */
export async function schedulePost(
    caption: string,
    platforms: BlotatoPlatform[],
    scheduledAt: Date,
    images: string[] = [],
    hashtags: string[] = [],
    isVideo: boolean = false
): Promise<BlotatoScheduleResult> {
    return scheduleWithBlotato({
        caption,
        hashtags,
        media: prepareMedia(images, isVideo),
        platforms,
        scheduledAt,
    });
}

// =============================================================================
// BACKWARD COMPATIBILITY
// =============================================================================

/**
 * Legacy function for posting to Twitter
 * Routes through Blotato
 */
export async function postToTwitter(text: string, images: string[] = []): Promise<BlotatoPostResult> {
    return postNow(text, ['twitter'], images, extractHashtags(text));
}

/**
 * Legacy function for posting to LinkedIn
 * Routes through Blotato
 */
export async function postToLinkedIn(text: string, images: string[] = []): Promise<BlotatoPostResult> {
    return postNow(text, ['linkedin'], images, extractHashtags(text));
}

/**
 * Legacy function for posting to Instagram
 * Routes through Blotato
 */
export async function postToInstagram(caption: string, images: string[] = []): Promise<BlotatoPostResult> {
    return postNow(caption, ['instagram'], images, extractHashtags(caption));
}

// =============================================================================
// PLATFORM VALIDATION
// =============================================================================

/**
 * Validate content for a specific platform
 */
export function validateContentForPlatform(
    content: string,
    platform: BlotatoPlatform,
    images: string[] = []
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = getPlatformConfig(platform);

    if (!config) {
        errors.push(`Unknown platform: ${platform}`);
        return { valid: false, errors };
    }

    // Check character limit
    if (config.maxCharacters && content.length > config.maxCharacters) {
        errors.push(`Content exceeds ${config.name} character limit of ${config.maxCharacters}`);
    }

    // Check image limits
    if (config.maxImages !== undefined) {
        if (config.maxImages === 0 && images.length > 0) {
            errors.push(`${config.name} does not support images`);
        } else if (images.length > config.maxImages) {
            errors.push(`${config.name} allows maximum ${config.maxImages} images`);
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate content for multiple platforms
 */
export function validateContentForPlatforms(
    content: string,
    platforms: BlotatoPlatform[],
    images: string[] = []
): { valid: boolean; errors: Record<BlotatoPlatform, string[]> } {
    const errors: Record<string, string[]> = {};
    let allValid = true;

    for (const platform of platforms) {
        const result = validateContentForPlatform(content, platform, images);
        if (!result.valid) {
            allValid = false;
            errors[platform] = result.errors;
        }
    }

    return { valid: allValid, errors: errors as Record<BlotatoPlatform, string[]> };
}

/**
 * Check if all platforms are configured (Blotato handles this)
 */
export function isPlatformConfigured(_platform: BlotatoPlatform): boolean {
    // With Blotato, all platform configuration is handled on Blotato's side
    // This always returns true as we rely on Blotato for platform management
    return true;
}

/**
 * Get configuration status for all platforms
 */
export function getConfigurationStatus(): Record<BlotatoPlatform, boolean> {
    const status: Record<string, boolean> = {};
    for (const platform of BLOTATO_PLATFORMS) {
        status[platform.id] = true;  // All platforms available via Blotato
    }
    return status as Record<BlotatoPlatform, boolean>;
}
