/**
 * Frontend service for interacting with the posts API
 * Handles all CRUD operations for drafts, scheduled posts, and published posts
 */

import { BlogPostResult, DraftPost, ScheduledPost, PublishedPost } from '../types';

const API_BASE = '/api';

// ==================== INITIALIZATION ====================

export async function initializeDatabase(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to initialize database');
    }

    return response.json();
}

// ==================== DRAFT OPERATIONS ====================

export async function fetchDrafts(): Promise<DraftPost[]> {
    const response = await fetch(`${API_BASE}/drafts`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to fetch drafts');
    }

    return response.json();
}

export async function fetchDraft(id: string): Promise<DraftPost> {
    const response = await fetch(`${API_BASE}/drafts/${id}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to fetch draft');
    }

    return response.json();
}

export async function saveDraft(post: BlogPostResult): Promise<DraftPost> {
    const response = await fetch(`${API_BASE}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to save draft');
    }

    return response.json();
}

export async function updateDraft(id: string, updates: Partial<BlogPostResult>): Promise<DraftPost> {
    const response = await fetch(`${API_BASE}/drafts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to update draft');
    }

    return response.json();
}

export async function deleteDraft(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/drafts/${id}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to delete draft');
    }
}

export async function publishDraftNow(id: string): Promise<PublishedPost> {
    const response = await fetch(`${API_BASE}/drafts/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to publish draft');
    }

    return response.json();
}

export async function scheduleDraftPost(id: string, scheduledDate: Date): Promise<ScheduledPost> {
    const response = await fetch(`${API_BASE}/drafts/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'schedule', scheduledDate: scheduledDate.toISOString() })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to schedule draft');
    }

    return response.json();
}

// ==================== SCHEDULED POST OPERATIONS ====================

export async function fetchScheduledPosts(): Promise<ScheduledPost[]> {
    const response = await fetch(`${API_BASE}/scheduled`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to fetch scheduled posts');
    }

    return response.json();
}

export async function fetchScheduledPost(id: string): Promise<ScheduledPost> {
    const response = await fetch(`${API_BASE}/scheduled/${id}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to fetch scheduled post');
    }

    return response.json();
}

export async function scheduleNewPost(post: BlogPostResult, scheduledDate: Date): Promise<ScheduledPost> {
    const response = await fetch(`${API_BASE}/scheduled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post, scheduledDate: scheduledDate.toISOString() })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to schedule post');
    }

    return response.json();
}

export async function reschedulePost(id: string, newDate: Date): Promise<ScheduledPost> {
    const response = await fetch(`${API_BASE}/scheduled/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: newDate.toISOString() })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to reschedule post');
    }

    return response.json();
}

export async function deleteScheduledPost(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/scheduled/${id}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to delete scheduled post');
    }
}

export async function publishScheduledNow(id: string): Promise<PublishedPost> {
    const response = await fetch(`${API_BASE}/scheduled/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to publish scheduled post');
    }

    return response.json();
}

export async function moveScheduledToDraft(id: string): Promise<DraftPost> {
    const response = await fetch(`${API_BASE}/scheduled/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'to_draft' })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to move to drafts');
    }

    return response.json();
}

// ==================== PUBLISHED POST OPERATIONS ====================

export async function fetchPublishedPosts(): Promise<PublishedPost[]> {
    const response = await fetch(`${API_BASE}/published`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to fetch published posts');
    }

    return response.json();
}

export async function fetchPublishedPost(idOrSlug: string): Promise<PublishedPost> {
    const response = await fetch(`${API_BASE}/published/${idOrSlug}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to fetch published post');
    }

    return response.json();
}

export async function publishPostImmediately(post: BlogPostResult): Promise<PublishedPost> {
    const response = await fetch(`${API_BASE}/published`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to publish post');
    }

    return response.json();
}

export async function deletePublishedPost(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/published/${id}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to delete published post');
    }
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
