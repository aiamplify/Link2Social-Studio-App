/**
 * Posts service using Supabase
 * Handles all CRUD operations for drafts, scheduled posts, and published posts
 * Works directly from the browser - no API routes needed
 */

import { supabase } from './supabaseClient';
import { BlogPostResult, DraftPost, ScheduledPost, PublishedPost } from '../types';

// ==================== HELPER FUNCTIONS ====================

function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ==================== DRAFT OPERATIONS ====================

export async function fetchDrafts(): Promise<DraftPost[]> {
    const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(row => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle || '',
        metadata: row.metadata || '',
        content: row.content,
        visuals: row.visuals || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: 'draft' as const
    }));
}

export async function fetchDraft(id: string): Promise<DraftPost | null> {
    const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(error.message);
    }

    return {
        id: data.id,
        title: data.title,
        subtitle: data.subtitle || '',
        metadata: data.metadata || '',
        content: data.content,
        visuals: data.visuals || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        status: 'draft'
    };
}

export async function saveDraft(post: BlogPostResult): Promise<DraftPost> {
    const id = generateId('draft');
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('drafts')
        .insert({
            id,
            title: post.title,
            subtitle: post.subtitle,
            metadata: post.metadata,
            content: post.content,
            visuals: post.visuals,
            created_at: now,
            updated_at: now
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    return {
        ...post,
        id: data.id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        status: 'draft'
    };
}

export async function updateDraft(id: string, updates: Partial<BlogPostResult>): Promise<DraftPost> {
    const { data, error } = await supabase
        .from('drafts')
        .update({
            ...(updates.title && { title: updates.title }),
            ...(updates.subtitle && { subtitle: updates.subtitle }),
            ...(updates.metadata && { metadata: updates.metadata }),
            ...(updates.content && { content: updates.content }),
            ...(updates.visuals && { visuals: updates.visuals }),
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);

    return {
        id: data.id,
        title: data.title,
        subtitle: data.subtitle || '',
        metadata: data.metadata || '',
        content: data.content,
        visuals: data.visuals || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        status: 'draft'
    };
}

export async function deleteDraft(id: string): Promise<void> {
    const { error } = await supabase
        .from('drafts')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
}

export async function publishDraftNow(id: string): Promise<PublishedPost> {
    // Get the draft
    const draft = await fetchDraft(id);
    if (!draft) throw new Error('Draft not found');

    // Publish it
    const published = await publishPostImmediately(draft);

    // Delete the draft
    await deleteDraft(id);

    return published;
}

export async function scheduleDraftPost(id: string, scheduledDate: Date): Promise<ScheduledPost> {
    // Get the draft
    const draft = await fetchDraft(id);
    if (!draft) throw new Error('Draft not found');

    // Create scheduled post
    const scheduled = await scheduleNewPost(draft, scheduledDate);

    // Delete the draft
    await deleteDraft(id);

    return scheduled;
}

// ==================== SCHEDULED POST OPERATIONS ====================

export async function fetchScheduledPosts(): Promise<ScheduledPost[]> {
    const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .order('scheduled_date', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map(row => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle || '',
        metadata: row.metadata || '',
        content: row.content,
        visuals: row.visuals || [],
        scheduledDate: row.scheduled_date,
        createdAt: row.created_at,
        status: 'scheduled' as const
    }));
}

export async function fetchScheduledPost(id: string): Promise<ScheduledPost | null> {
    const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
    }

    return {
        id: data.id,
        title: data.title,
        subtitle: data.subtitle || '',
        metadata: data.metadata || '',
        content: data.content,
        visuals: data.visuals || [],
        scheduledDate: data.scheduled_date,
        createdAt: data.created_at,
        status: 'scheduled'
    };
}

export async function scheduleNewPost(post: BlogPostResult, scheduledDate: Date): Promise<ScheduledPost> {
    const id = generateId('scheduled');
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('scheduled_posts')
        .insert({
            id,
            title: post.title,
            subtitle: post.subtitle,
            metadata: post.metadata,
            content: post.content,
            visuals: post.visuals,
            scheduled_date: scheduledDate.toISOString(),
            created_at: now
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    return {
        ...post,
        id: data.id,
        scheduledDate: data.scheduled_date,
        createdAt: data.created_at,
        status: 'scheduled'
    };
}

export async function reschedulePost(id: string, newDate: Date): Promise<ScheduledPost> {
    const { data, error } = await supabase
        .from('scheduled_posts')
        .update({ scheduled_date: newDate.toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);

    return {
        id: data.id,
        title: data.title,
        subtitle: data.subtitle || '',
        metadata: data.metadata || '',
        content: data.content,
        visuals: data.visuals || [],
        scheduledDate: data.scheduled_date,
        createdAt: data.created_at,
        status: 'scheduled'
    };
}

export async function deleteScheduledPost(id: string): Promise<void> {
    const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
}

export async function publishScheduledNow(id: string): Promise<PublishedPost> {
    // Get the scheduled post
    const scheduled = await fetchScheduledPost(id);
    if (!scheduled) throw new Error('Scheduled post not found');

    // Publish it
    const published = await publishPostImmediately(scheduled);

    // Delete from scheduled
    await deleteScheduledPost(id);

    return published;
}

export async function moveScheduledToDraft(id: string): Promise<DraftPost> {
    // Get the scheduled post
    const scheduled = await fetchScheduledPost(id);
    if (!scheduled) throw new Error('Scheduled post not found');

    // Create draft
    const draft = await saveDraft(scheduled);

    // Delete from scheduled
    await deleteScheduledPost(id);

    return draft;
}

// ==================== PUBLISHED POST OPERATIONS ====================

export async function fetchPublishedPosts(): Promise<PublishedPost[]> {
    const { data, error } = await supabase
        .from('published_posts')
        .select('*')
        .order('publish_date', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(row => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle || '',
        metadata: row.metadata || '',
        content: row.content,
        visuals: row.visuals || [],
        slug: row.slug,
        publishDate: new Date(row.publish_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
    }));
}

export async function fetchPublishedPost(idOrSlug: string): Promise<PublishedPost | null> {
    const { data, error } = await supabase
        .from('published_posts')
        .select('*')
        .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
    }

    return {
        id: data.id,
        title: data.title,
        subtitle: data.subtitle || '',
        metadata: data.metadata || '',
        content: data.content,
        visuals: data.visuals || [],
        slug: data.slug,
        publishDate: new Date(data.publish_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
    };
}

export async function publishPostImmediately(post: BlogPostResult): Promise<PublishedPost> {
    const id = generateId('published');
    const slug = generateSlug(post.title);
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('published_posts')
        .insert({
            id,
            title: post.title,
            subtitle: post.subtitle,
            metadata: post.metadata,
            content: post.content,
            visuals: post.visuals,
            slug,
            publish_date: now,
            created_at: now
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    return {
        ...post,
        id: data.id,
        slug: data.slug,
        publishDate: new Date(data.publish_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
    };
}

export async function deletePublishedPost(id: string): Promise<void> {
    const { error } = await supabase
        .from('published_posts')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
}

// ==================== AUTO-PUBLISH SCHEDULED POSTS ====================

/**
 * Check for and publish any scheduled posts that are due
 * Call this on app load or when viewing scheduled posts
 */
export async function publishDuePosts(): Promise<PublishedPost[]> {
    const now = new Date().toISOString();

    // Get all posts that are due
    const { data: duePosts, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .lte('scheduled_date', now);

    if (error) throw new Error(error.message);

    const publishedPosts: PublishedPost[] = [];

    for (const post of duePosts || []) {
        try {
            const published = await publishScheduledNow(post.id);
            publishedPosts.push(published);
            console.log(`Auto-published: ${post.title}`);
        } catch (err) {
            console.error(`Failed to auto-publish ${post.id}:`, err);
        }
    }

    return publishedPosts;
}

// ==================== UTILITY FUNCTIONS ====================

export function formatScheduledDate(date: Date): string {
    return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

export function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMs < 0) {
        // Past
        if (diffMins > -60) return `${Math.abs(diffMins)}m ago`;
        if (diffHours > -24) return `${Math.abs(diffHours)}h ago`;
        return `${Math.abs(diffDays)}d ago`;
    } else {
        // Future
        if (diffMins < 60) return `in ${diffMins}m`;
        if (diffHours < 24) return `in ${diffHours}h`;
        return `in ${diffDays}d`;
    }
}

export function isPostDue(scheduledDate: string): boolean {
    return new Date(scheduledDate) <= new Date();
}
