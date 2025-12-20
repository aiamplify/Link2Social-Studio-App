/**
 * Calendar Service - Social Media Content Calendar
 *
 * Handles all CRUD operations for scheduled social media posts.
 * Works directly from the browser via Supabase client.
 */

import { supabase } from './supabaseClient';
import { CalendarPost, SchedulePostData, SocialPlatform, CalendarPostStatus } from '../types';

// ==================== HELPER FUNCTIONS ====================

function generateId(): string {
    return `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== FETCH OPERATIONS ====================

/**
 * Fetch all calendar posts
 */
export async function fetchCalendarPosts(): Promise<CalendarPost[]> {
    const { data, error } = await supabase
        .from('calendar_posts')
        .select('*')
        .order('scheduled_at', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map(mapDbToCalendarPost);
}

/**
 * Fetch calendar posts for a specific date range
 */
export async function fetchCalendarPostsInRange(
    startDate: Date,
    endDate: Date
): Promise<CalendarPost[]> {
    const { data, error } = await supabase
        .from('calendar_posts')
        .select('*')
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString())
        .order('scheduled_at', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map(mapDbToCalendarPost);
}

/**
 * Fetch calendar posts for a specific month
 */
export async function fetchCalendarPostsForMonth(
    year: number,
    month: number
): Promise<CalendarPost[]> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    return fetchCalendarPostsInRange(startDate, endDate);
}

/**
 * Fetch a single calendar post by ID
 */
export async function fetchCalendarPost(id: string): Promise<CalendarPost | null> {
    const { data, error } = await supabase
        .from('calendar_posts')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(error.message);
    }

    return mapDbToCalendarPost(data);
}

/**
 * Fetch posts due for publishing (scheduled_at <= now and status = 'scheduled')
 */
export async function fetchDuePosts(): Promise<CalendarPost[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('calendar_posts')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now)
        .order('scheduled_at', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map(mapDbToCalendarPost);
}

/**
 * Fetch posts by status
 */
export async function fetchPostsByStatus(status: CalendarPostStatus): Promise<CalendarPost[]> {
    const { data, error } = await supabase
        .from('calendar_posts')
        .select('*')
        .eq('status', status)
        .order('scheduled_at', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map(mapDbToCalendarPost);
}

/**
 * Fetch posts by platform
 */
export async function fetchPostsByPlatform(platform: SocialPlatform): Promise<CalendarPost[]> {
    const { data, error } = await supabase
        .from('calendar_posts')
        .select('*')
        .eq('platform', platform)
        .order('scheduled_at', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map(mapDbToCalendarPost);
}

// ==================== CREATE OPERATIONS ====================

/**
 * Schedule a new post
 */
export async function schedulePost(postData: SchedulePostData): Promise<CalendarPost> {
    const id = generateId();
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('calendar_posts')
        .insert({
            id,
            title: postData.title,
            content: postData.content,
            platform: postData.platform,
            scheduled_at: postData.scheduledAt.toISOString(),
            status: 'scheduled',
            post_type: postData.postType,
            images: postData.images,
            hashtags: postData.hashtags,
            source_type: postData.sourceType,
            source_id: postData.sourceId || null,
            created_at: now,
            updated_at: now,
            retry_count: 0
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    return mapDbToCalendarPost(data);
}

/**
 * Schedule multiple posts at once (e.g., same content to multiple platforms)
 */
export async function scheduleMultiplePosts(
    postDataArray: SchedulePostData[]
): Promise<CalendarPost[]> {
    const now = new Date().toISOString();

    const postsToInsert = postDataArray.map(postData => ({
        id: generateId(),
        title: postData.title,
        content: postData.content,
        platform: postData.platform,
        scheduled_at: postData.scheduledAt.toISOString(),
        status: 'scheduled',
        post_type: postData.postType,
        images: postData.images,
        hashtags: postData.hashtags,
        source_type: postData.sourceType,
        source_id: postData.sourceId || null,
        created_at: now,
        updated_at: now,
        retry_count: 0
    }));

    const { data, error } = await supabase
        .from('calendar_posts')
        .insert(postsToInsert)
        .select();

    if (error) throw new Error(error.message);

    return (data || []).map(mapDbToCalendarPost);
}

// ==================== UPDATE OPERATIONS ====================

/**
 * Update a calendar post
 */
export async function updateCalendarPost(
    id: string,
    updates: Partial<Omit<CalendarPost, 'id' | 'createdAt'>>
): Promise<CalendarPost> {
    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.platform !== undefined) updateData.platform = updates.platform;
    if (updates.scheduledAt !== undefined) updateData.scheduled_at = updates.scheduledAt;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.postType !== undefined) updateData.post_type = updates.postType;
    if (updates.images !== undefined) updateData.images = updates.images;
    if (updates.hashtags !== undefined) updateData.hashtags = updates.hashtags;
    if (updates.postedAt !== undefined) updateData.posted_at = updates.postedAt;
    if (updates.postUrl !== undefined) updateData.post_url = updates.postUrl;
    if (updates.postId !== undefined) updateData.post_id = updates.postId;
    if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;
    if (updates.retryCount !== undefined) updateData.retry_count = updates.retryCount;

    const { data, error } = await supabase
        .from('calendar_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);

    return mapDbToCalendarPost(data);
}

/**
 * Reschedule a post to a new date/time
 */
export async function reschedulePost(id: string, newDate: Date): Promise<CalendarPost> {
    return updateCalendarPost(id, {
        scheduledAt: newDate.toISOString(),
        status: 'scheduled',
        errorMessage: undefined,
        retryCount: 0
    });
}

/**
 * Mark a post as posting (in progress)
 */
export async function markPostAsPosting(id: string): Promise<CalendarPost> {
    return updateCalendarPost(id, { status: 'posting' });
}

/**
 * Mark a post as successfully posted
 */
export async function markPostAsPosted(
    id: string,
    postUrl?: string,
    postId?: string
): Promise<CalendarPost> {
    return updateCalendarPost(id, {
        status: 'posted',
        postedAt: new Date().toISOString(),
        postUrl,
        postId,
        errorMessage: undefined
    });
}

/**
 * Mark a post as failed
 */
export async function markPostAsFailed(
    id: string,
    errorMessage: string,
    incrementRetry: boolean = true
): Promise<CalendarPost> {
    const post = await fetchCalendarPost(id);
    if (!post) throw new Error('Post not found');

    return updateCalendarPost(id, {
        status: 'failed',
        errorMessage,
        retryCount: incrementRetry ? post.retryCount + 1 : post.retryCount
    });
}

/**
 * Retry a failed post (reset status to scheduled)
 */
export async function retryFailedPost(id: string): Promise<CalendarPost> {
    return updateCalendarPost(id, {
        status: 'scheduled',
        errorMessage: undefined
    });
}

// ==================== DELETE OPERATIONS ====================

/**
 * Delete a calendar post
 */
export async function deleteCalendarPost(id: string): Promise<void> {
    const { error } = await supabase
        .from('calendar_posts')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
}

/**
 * Delete multiple calendar posts
 */
export async function deleteMultipleCalendarPosts(ids: string[]): Promise<void> {
    const { error } = await supabase
        .from('calendar_posts')
        .delete()
        .in('id', ids);

    if (error) throw new Error(error.message);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Map database row to CalendarPost type
 */
function mapDbToCalendarPost(row: Record<string, unknown>): CalendarPost {
    return {
        id: row.id as string,
        title: row.title as string,
        content: row.content as string,
        platform: row.platform as SocialPlatform,
        scheduledAt: row.scheduled_at as string,
        status: row.status as CalendarPostStatus,
        postType: row.post_type as CalendarPost['postType'],
        images: (row.images as string[]) || [],
        hashtags: (row.hashtags as string[]) || [],
        sourceType: row.source_type as CalendarPost['sourceType'],
        sourceId: row.source_id as string | undefined,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        postedAt: row.posted_at as string | undefined,
        postUrl: row.post_url as string | undefined,
        postId: row.post_id as string | undefined,
        blotatoScheduleId: row.blotato_schedule_id as string | undefined,
        errorMessage: row.error_message as string | undefined,
        retryCount: (row.retry_count as number) || 0
    };
}

/**
 * Get posts grouped by date for calendar display
 */
export function groupPostsByDate(posts: CalendarPost[]): Map<string, CalendarPost[]> {
    const grouped = new Map<string, CalendarPost[]>();

    for (const post of posts) {
        const dateKey = new Date(post.scheduledAt).toISOString().split('T')[0];
        const existing = grouped.get(dateKey) || [];
        grouped.set(dateKey, [...existing, post]);
    }

    return grouped;
}

/**
 * Get platform color for UI display
 * Supports all 8 Blotato platforms
 */
export function getPlatformColor(platform: SocialPlatform): string {
    switch (platform) {
        case 'twitter':
            return 'sky';
        case 'facebook':
            return 'blue';
        case 'instagram':
            return 'pink';
        case 'linkedin':
            return 'indigo';
        case 'bluesky':
            return 'cyan';
        case 'threads':
            return 'slate';
        case 'tiktok':
            return 'rose';
        case 'youtube':
            return 'red';
        default:
            return 'slate';
    }
}

/**
 * Get platform display name
 * Supports all 8 Blotato platforms
 */
export function getPlatformName(platform: SocialPlatform): string {
    switch (platform) {
        case 'twitter':
            return 'Twitter/X';
        case 'facebook':
            return 'Facebook';
        case 'instagram':
            return 'Instagram';
        case 'linkedin':
            return 'LinkedIn';
        case 'bluesky':
            return 'BlueSky';
        case 'threads':
            return 'Threads';
        case 'tiktok':
            return 'TikTok';
        case 'youtube':
            return 'YouTube';
        default:
            return platform;
    }
}

/**
 * Get status color for UI display
 */
export function getStatusColor(status: CalendarPostStatus): string {
    switch (status) {
        case 'scheduled':
            return 'amber';
        case 'posting':
            return 'blue';
        case 'posted':
            return 'emerald';
        case 'failed':
            return 'red';
        default:
            return 'slate';
    }
}

/**
 * Format scheduled date for display
 */
export function formatScheduledDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Get relative time until scheduled post
 */
export function getTimeUntilPost(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();

    if (diffMs < 0) return 'Due now';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `in ${diffMins}m`;
    if (diffHours < 24) return `in ${diffHours}h`;
    if (diffDays < 7) return `in ${diffDays}d`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Check if a post is overdue (past scheduled time and not posted)
 */
export function isPostOverdue(post: CalendarPost): boolean {
    return (
        post.status === 'scheduled' &&
        new Date(post.scheduledAt) < new Date()
    );
}

/**
 * Extract hashtags from content string
 */
export function extractHashtags(content: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    const matches = content.match(hashtagRegex) || [];
    return matches.map(tag => tag.slice(1)); // Remove # prefix
}

/**
 * Get calendar stats for a date range
 * Supports all 8 Blotato platforms
 */
export async function getCalendarStats(
    startDate: Date,
    endDate: Date
): Promise<{
    total: number;
    scheduled: number;
    posted: number;
    failed: number;
    byPlatform: Record<SocialPlatform, number>;
}> {
    const posts = await fetchCalendarPostsInRange(startDate, endDate);

    const stats = {
        total: posts.length,
        scheduled: 0,
        posted: 0,
        failed: 0,
        byPlatform: {
            twitter: 0,
            facebook: 0,
            instagram: 0,
            linkedin: 0,
            bluesky: 0,
            threads: 0,
            tiktok: 0,
            youtube: 0
        } as Record<SocialPlatform, number>
    };

    for (const post of posts) {
        if (post.status === 'scheduled' || post.status === 'posting') {
            stats.scheduled++;
        } else if (post.status === 'posted') {
            stats.posted++;
        } else if (post.status === 'failed') {
            stats.failed++;
        }

        if (stats.byPlatform[post.platform] !== undefined) {
            stats.byPlatform[post.platform]++;
        }
    }

    return stats;
}
