/**
 * Database configuration and helper functions for Vercel Postgres
 * This module provides all database operations for drafts, scheduled posts, and published posts
 */

import { sql } from '@vercel/postgres';
import { BlogPostResult, BlogVisual, DraftPost, ScheduledPost, PublishedPost } from '../types';

// Initialize database tables
export async function initializeDatabase() {
    // Create drafts table
    await sql`
        CREATE TABLE IF NOT EXISTS drafts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            subtitle TEXT,
            metadata TEXT,
            content TEXT NOT NULL,
            visuals JSONB DEFAULT '[]',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;

    // Create scheduled_posts table
    await sql`
        CREATE TABLE IF NOT EXISTS scheduled_posts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            subtitle TEXT,
            metadata TEXT,
            content TEXT NOT NULL,
            visuals JSONB DEFAULT '[]',
            scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;

    // Create published_posts table
    await sql`
        CREATE TABLE IF NOT EXISTS published_posts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            subtitle TEXT,
            metadata TEXT,
            content TEXT NOT NULL,
            visuals JSONB DEFAULT '[]',
            slug TEXT UNIQUE NOT NULL,
            publish_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;

    return { success: true };
}

// ==================== DRAFT OPERATIONS ====================

export async function createDraft(post: BlogPostResult): Promise<DraftPost> {
    const id = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await sql`
        INSERT INTO drafts (id, title, subtitle, metadata, content, visuals)
        VALUES (${id}, ${post.title}, ${post.subtitle}, ${post.metadata}, ${post.content}, ${JSON.stringify(post.visuals)})
    `;

    return {
        ...post,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft'
    };
}

export async function getDrafts(): Promise<DraftPost[]> {
    const result = await sql`
        SELECT * FROM drafts ORDER BY updated_at DESC
    `;

    return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        metadata: row.metadata,
        content: row.content,
        visuals: typeof row.visuals === 'string' ? JSON.parse(row.visuals) : row.visuals,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: 'draft' as const
    }));
}

export async function getDraft(id: string): Promise<DraftPost | null> {
    const result = await sql`
        SELECT * FROM drafts WHERE id = ${id}
    `;

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        metadata: row.metadata,
        content: row.content,
        visuals: typeof row.visuals === 'string' ? JSON.parse(row.visuals) : row.visuals,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: 'draft'
    };
}

export async function updateDraft(id: string, post: Partial<BlogPostResult>): Promise<DraftPost | null> {
    const existing = await getDraft(id);
    if (!existing) return null;

    await sql`
        UPDATE drafts
        SET
            title = ${post.title ?? existing.title},
            subtitle = ${post.subtitle ?? existing.subtitle},
            metadata = ${post.metadata ?? existing.metadata},
            content = ${post.content ?? existing.content},
            visuals = ${JSON.stringify(post.visuals ?? existing.visuals)},
            updated_at = NOW()
        WHERE id = ${id}
    `;

    return getDraft(id);
}

export async function deleteDraft(id: string): Promise<boolean> {
    const result = await sql`
        DELETE FROM drafts WHERE id = ${id}
    `;
    return result.rowCount > 0;
}

// ==================== SCHEDULED POST OPERATIONS ====================

export async function schedulePost(post: BlogPostResult, scheduledDate: Date): Promise<ScheduledPost> {
    const id = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await sql`
        INSERT INTO scheduled_posts (id, title, subtitle, metadata, content, visuals, scheduled_date)
        VALUES (${id}, ${post.title}, ${post.subtitle}, ${post.metadata}, ${post.content}, ${JSON.stringify(post.visuals)}, ${scheduledDate.toISOString()})
    `;

    return {
        ...post,
        id,
        scheduledDate: scheduledDate.toISOString(),
        createdAt: new Date().toISOString(),
        status: 'scheduled'
    };
}

export async function getScheduledPosts(): Promise<ScheduledPost[]> {
    const result = await sql`
        SELECT * FROM scheduled_posts ORDER BY scheduled_date ASC
    `;

    return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        metadata: row.metadata,
        content: row.content,
        visuals: typeof row.visuals === 'string' ? JSON.parse(row.visuals) : row.visuals,
        scheduledDate: row.scheduled_date,
        createdAt: row.created_at,
        status: 'scheduled' as const
    }));
}

export async function getScheduledPost(id: string): Promise<ScheduledPost | null> {
    const result = await sql`
        SELECT * FROM scheduled_posts WHERE id = ${id}
    `;

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        metadata: row.metadata,
        content: row.content,
        visuals: typeof row.visuals === 'string' ? JSON.parse(row.visuals) : row.visuals,
        scheduledDate: row.scheduled_date,
        createdAt: row.created_at,
        status: 'scheduled'
    };
}

export async function updateScheduledPost(id: string, updates: { scheduledDate?: Date; post?: Partial<BlogPostResult> }): Promise<ScheduledPost | null> {
    const existing = await getScheduledPost(id);
    if (!existing) return null;

    if (updates.scheduledDate) {
        await sql`
            UPDATE scheduled_posts SET scheduled_date = ${updates.scheduledDate.toISOString()} WHERE id = ${id}
        `;
    }

    if (updates.post) {
        await sql`
            UPDATE scheduled_posts
            SET
                title = ${updates.post.title ?? existing.title},
                subtitle = ${updates.post.subtitle ?? existing.subtitle},
                metadata = ${updates.post.metadata ?? existing.metadata},
                content = ${updates.post.content ?? existing.content},
                visuals = ${JSON.stringify(updates.post.visuals ?? existing.visuals)}
            WHERE id = ${id}
        `;
    }

    return getScheduledPost(id);
}

export async function deleteScheduledPost(id: string): Promise<boolean> {
    const result = await sql`
        DELETE FROM scheduled_posts WHERE id = ${id}
    `;
    return result.rowCount > 0;
}

export async function getPostsDueForPublishing(): Promise<ScheduledPost[]> {
    const result = await sql`
        SELECT * FROM scheduled_posts
        WHERE scheduled_date <= NOW()
        ORDER BY scheduled_date ASC
    `;

    return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        metadata: row.metadata,
        content: row.content,
        visuals: typeof row.visuals === 'string' ? JSON.parse(row.visuals) : row.visuals,
        scheduledDate: row.scheduled_date,
        createdAt: row.created_at,
        status: 'scheduled' as const
    }));
}

// ==================== PUBLISHED POST OPERATIONS ====================

export async function publishPost(post: BlogPostResult | ScheduledPost | DraftPost): Promise<PublishedPost> {
    const id = `published_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const slug = post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const publishDate = new Date();

    await sql`
        INSERT INTO published_posts (id, title, subtitle, metadata, content, visuals, slug, publish_date)
        VALUES (${id}, ${post.title}, ${post.subtitle}, ${post.metadata}, ${post.content}, ${JSON.stringify(post.visuals)}, ${slug}, ${publishDate.toISOString()})
    `;

    return {
        ...post,
        id,
        slug,
        publishDate: publishDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
}

export async function getPublishedPosts(): Promise<PublishedPost[]> {
    const result = await sql`
        SELECT * FROM published_posts ORDER BY publish_date DESC
    `;

    return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        metadata: row.metadata,
        content: row.content,
        visuals: typeof row.visuals === 'string' ? JSON.parse(row.visuals) : row.visuals,
        slug: row.slug,
        publishDate: new Date(row.publish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }));
}

export async function getPublishedPost(idOrSlug: string): Promise<PublishedPost | null> {
    const result = await sql`
        SELECT * FROM published_posts WHERE id = ${idOrSlug} OR slug = ${idOrSlug}
    `;

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        metadata: row.metadata,
        content: row.content,
        visuals: typeof row.visuals === 'string' ? JSON.parse(row.visuals) : row.visuals,
        slug: row.slug,
        publishDate: new Date(row.publish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
}

export async function deletePublishedPost(id: string): Promise<boolean> {
    const result = await sql`
        DELETE FROM published_posts WHERE id = ${id}
    `;
    return result.rowCount > 0;
}

// ==================== WORKFLOW OPERATIONS ====================

export async function publishScheduledPost(scheduledPostId: string): Promise<PublishedPost | null> {
    const scheduledPost = await getScheduledPost(scheduledPostId);
    if (!scheduledPost) return null;

    // Publish the post
    const publishedPost = await publishPost(scheduledPost);

    // Delete from scheduled posts
    await deleteScheduledPost(scheduledPostId);

    return publishedPost;
}

export async function publishDraft(draftId: string): Promise<PublishedPost | null> {
    const draft = await getDraft(draftId);
    if (!draft) return null;

    // Publish the post
    const publishedPost = await publishPost(draft);

    // Delete from drafts
    await deleteDraft(draftId);

    return publishedPost;
}

export async function scheduleDraft(draftId: string, scheduledDate: Date): Promise<ScheduledPost | null> {
    const draft = await getDraft(draftId);
    if (!draft) return null;

    // Create scheduled post
    const scheduledPost = await schedulePost(draft, scheduledDate);

    // Delete from drafts
    await deleteDraft(draftId);

    return scheduledPost;
}

export async function moveToDraft(scheduledPostId: string): Promise<DraftPost | null> {
    const scheduledPost = await getScheduledPost(scheduledPostId);
    if (!scheduledPost) return null;

    // Create draft
    const draft = await createDraft(scheduledPost);

    // Delete from scheduled
    await deleteScheduledPost(scheduledPostId);

    return draft;
}
