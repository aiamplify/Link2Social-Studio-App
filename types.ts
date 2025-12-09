
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

export enum ViewMode {
  HOME = 'HOME',
  REPO_ANALYZER = 'REPO_ANALYZER',
  ARTICLE_INFOGRAPHIC = 'ARTICLE_INFOGRAPHIC',
  CAROUSEL_GENERATOR = 'CAROUSEL_GENERATOR',
  BLOG_TO_BLOG = 'BLOG_TO_BLOG',
  YOUTUBE_THUMBNAIL = 'YOUTUBE_THUMBNAIL',
  VIDEO_BROLL = 'VIDEO_BROLL',
  VIDEO_SCRIPT_VISUALIZER = 'VIDEO_SCRIPT_VISUALIZER',
  DRAFTS = 'DRAFTS',
  SCHEDULED = 'SCHEDULED',
  CONTENT_BUNDLE_DRAFTS = 'CONTENT_BUNDLE_DRAFTS',
  CONTENT_CALENDAR = 'CONTENT_CALENDAR'
}

export interface D3Node extends SimulationNodeDatum {
  id: string;
  group: number;
  label: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface D3Link extends SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
  value: number;
}

export interface DataFlowGraph {
  nodes: D3Node[];
  links: D3Link[];
}

export interface RepoFileTree {
  path: string;
  type: string;
}

export interface DevStudioState {
  repoName: string;
  fileTree: RepoFileTree[];
  graphData: DataFlowGraph;
}

export interface Citation {
    uri: string;
    title: string;
}

export interface RepoHistoryItem {
  id: string;
  repoName: string;
  imageData: string;
  is3D: boolean;
  style: string;
  date: Date;
}

export interface SocialPost {
  platform: string;
  content: string;
}

export interface ArticleHistoryItem {
    id: string;
    title: string;
    url: string;
    imageData: string;
    citations: Citation[];
    socialPosts: SocialPost[];
    date: Date;
}

export interface CarouselSlide {
    order: number;
    title: string;
    content: string;
    imageData: string | null;
}

export interface CarouselResult {
    slides: CarouselSlide[];
    caption: string;                    // Legacy single caption (fallback)
    captions?: SocialPost[];            // Multi-platform captions
}

export interface BlogVisual {
    id: string; // e.g., "header", "image_1", "image_2"
    prompt: string;
    caption: string;
    imageData: string | null;
    status?: 'pending' | 'generating' | 'complete' | 'error';
}

export interface BlogPostResult {
    title: string;
    subtitle: string;
    metadata: string; // "Author | Date | Category"
    content: string; // Markdown content containing placeholders like [[IMAGE_1]]
    visuals: BlogVisual[];
}

export interface PublishedPost extends BlogPostResult {
    id: string;
    publishDate: string;
    slug: string;
}

// Draft post - saved but not yet published
export interface DraftPost extends BlogPostResult {
    id: string;
    createdAt: string;
    updatedAt: string;
    status: 'draft';
}

// Scheduled post - will be auto-published at scheduled time
export interface ScheduledPost extends BlogPostResult {
    id: string;
    scheduledDate: string;
    createdAt: string;
    status: 'scheduled';
}

// Union type for all post states
export type PostState = DraftPost | ScheduledPost | PublishedPost;

// Content Bundle types (for ArticleToInfographic / Content Bundle Creator)
export interface ContentBundleResult {
    imageData: string | null;           // Base64 encoded PNG infographic
    citations: Citation[];              // Web sources/references
    socialPosts: SocialPost[];          // Platform-specific posts
    sourceInput: string;                // Original URL or topic text
    inputMode: 'url' | 'prompt' | 'upload';
    style: string;                      // Style preset used
    platforms: string[];                // Target platforms
    language: string;                   // Output language
}

// Draft content bundle - saved but not yet used
export interface ContentBundleDraft extends ContentBundleResult {
    id: string;
    title: string;                      // Auto-generated or user-provided title
    createdAt: string;
    updatedAt: string;
    status: 'draft';
}

export interface ScriptScene {
    id: string;
    segmentText: string;
    imageData: string | null;
    status: 'idle' | 'generating' | 'complete' | 'error';
}

// ==================== CONTENT CALENDAR TYPES ====================

export type SocialPlatform = 'twitter' | 'linkedin' | 'instagram';

export type CalendarPostStatus = 'scheduled' | 'posting' | 'posted' | 'failed';

export type CalendarPostType = 'image' | 'carousel' | 'video' | 'text';

export interface CalendarPost {
    id: string;
    title: string;
    content: string;                    // The post text/caption
    platform: SocialPlatform;
    scheduledAt: string;                // ISO timestamp for when to post
    status: CalendarPostStatus;
    postType: CalendarPostType;
    images: string[];                   // Base64 encoded images
    hashtags: string[];
    sourceType: 'content_bundle' | 'carousel' | 'blog' | 'thumbnail' | 'manual';
    sourceId?: string;                  // Reference to source content bundle/carousel/etc
    createdAt: string;
    updatedAt: string;
    postedAt?: string;                  // When it was actually posted
    postUrl?: string;                   // URL of the published post
    postId?: string;                    // Platform post ID
    errorMessage?: string;              // Error message if posting failed
    retryCount: number;                 // Number of retry attempts
}

export interface CalendarDay {
    date: Date;
    posts: CalendarPost[];
    isCurrentMonth: boolean;
    isToday: boolean;
}

export interface CalendarWeek {
    days: CalendarDay[];
}

export interface CalendarMonth {
    year: number;
    month: number;
    weeks: CalendarWeek[];
}

// For the schedule modal
export interface SchedulePostData {
    title: string;
    content: string;
    platform: SocialPlatform;
    scheduledAt: Date;
    postType: CalendarPostType;
    images: string[];
    hashtags: string[];
    sourceType: CalendarPost['sourceType'];
    sourceId?: string;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
