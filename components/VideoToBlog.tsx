/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import JSZip from 'jszip';
import {
    VideoFrame,
    VideoBlogConfiguration,
    VideoBlogState,
    VideoBlogLength,
    VideoBlogTone,
    BlogPostResult,
    BlogVisual
} from '../types';
import {
    extractFramesFromVideo,
    generateBlogFromVideo
} from '../services/videoToBlogService';
import {
    Upload,
    FileVideo,
    Sparkles,
    AlertCircle,
    Settings,
    RefreshCw,
    Copy,
    Download,
    Check,
    Loader2,
    Video,
    FileText,
    ChevronDown,
    ChevronUp,
    Target,
    Users,
    Clock,
    Zap,
    BookOpen,
    Palette,
    Eye,
    Calendar,
    Save,
    Send,
    Image as ImageIcon,
    Package,
    X
} from 'lucide-react';

// Configuration options
const LENGTH_OPTIONS: { id: VideoBlogLength; label: string; words: string; description: string }[] = [
    { id: 'short', label: "Short", words: "~400-600 words", description: "Concise and direct" },
    { id: 'medium', label: "Medium", words: "~800-1200 words", description: "Balanced detail" },
    { id: 'long', label: "Long", words: "~1500+ words", description: "Comprehensive deep dive" },
];

const TONE_OPTIONS: { id: VideoBlogTone; label: string; description: string }[] = [
    { id: 'instructional', label: 'Instructional', description: 'Clear step-by-step guidance' },
    { id: 'professional', label: 'Professional', description: 'Business-appropriate tone' },
    { id: 'casual', label: 'Casual', description: 'Friendly and approachable' },
    { id: 'enthusiastic', label: 'Enthusiastic', description: 'Energetic and engaging' },
];

interface VideoToBlogProps {
    onPublish?: (post: BlogPostResult) => void;
    onSaveDraft?: (post: BlogPostResult) => Promise<void>;
    onSchedule?: (post: BlogPostResult, scheduledDate: Date) => Promise<void>;
}

const VideoToBlog: React.FC<VideoToBlogProps> = ({ onPublish, onSaveDraft, onSchedule }) => {
    // State
    const [state, setState] = useState<VideoBlogState>({
        status: 'idle',
        progress: 0,
        frames: []
    });

    // Configuration state
    const [config, setConfig] = useState<VideoBlogConfiguration>({
        length: 'medium',
        tone: 'instructional',
        targetAudience: 'General Audience',
        includeConclusion: true
    });

    // UI state
    const [dragActive, setDragActive] = useState(false);
    const [showConfig, setShowConfig] = useState(true);
    const [copiedContent, setCopiedContent] = useState(false);
    const [showFramesModal, setShowFramesModal] = useState(false);

    // Publishing state
    const [isPublished, setIsPublished] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [draftSaved, setDraftSaved] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);

    // Refs
    const inputRef = useRef<HTMLInputElement>(null);

    // Handle file selection
    const handleFileSelect = async (file: File) => {
        if (!file.type.startsWith('video/')) {
            setState(prev => ({
                ...prev,
                status: 'error',
                error: 'Please upload a valid video file.'
            }));
            return;
        }

        setState({
            status: 'processing_video',
            progress: 0,
            frames: [],
            videoName: file.name
        });

        try {
            const frames = await extractFramesFromVideo(file, 16, (prog) => {
                setState(prev => ({ ...prev, progress: prog }));
            });

            setState(prev => ({
                ...prev,
                frames,
                status: 'configuring',
                progress: 0
            }));
        } catch (error: any) {
            console.error(error);
            setState(prev => ({
                ...prev,
                status: 'error',
                error: error.message || "An unexpected error occurred while processing the video."
            }));
        }
    };

    // Handle blog generation
    const handleGenerate = async () => {
        setState(prev => ({ ...prev, status: 'generating_text', config }));

        try {
            const generatedText = await generateBlogFromVideo(state.frames, config);

            setState(prev => ({
                ...prev,
                status: 'complete',
                markdownContent: generatedText
            }));
        } catch (error: any) {
            console.error(error);
            setState(prev => ({
                ...prev,
                status: 'error',
                error: error.message || "Failed to generate blog post. Please try again."
            }));
        }
    };

    // Reset to initial state
    const handleReset = () => {
        setState({
            status: 'idle',
            progress: 0,
            frames: []
        });
        setIsPublished(false);
        setDraftSaved(false);
        setScheduleDate('');
        setScheduleTime('');
    };

    // Drag and drop handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    // Copy markdown to clipboard
    const handleCopy = async () => {
        if (state.markdownContent) {
            await navigator.clipboard.writeText(state.markdownContent);
            setCopiedContent(true);
            setTimeout(() => setCopiedContent(false), 2000);
        }
    };

    // Download single screenshot
    const downloadSingleScreenshot = (frame: VideoFrame, index: number) => {
        const link = document.createElement('a');
        link.href = frame.dataUrl;
        link.download = `screenshot-${index + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Download all screenshots as ZIP
    const downloadAllScreenshots = async () => {
        const zip = new JSZip();
        const folder = zip.folder('screenshots');

        if (!folder) return;

        state.frames.forEach((frame, index) => {
            // Extract base64 data from data URL
            const base64Data = frame.dataUrl.split(',')[1];
            folder.file(`screenshot-${String(index + 1).padStart(2, '0')}.jpg`, base64Data, { base64: true });
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${state.videoName?.replace(/\.[^/.]+$/, '') || 'video'}-screenshots.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    // Convert to BlogPostResult format for publishing
    const createBlogPostResult = (): BlogPostResult => {
        // Extract title from markdown content
        const titleMatch = state.markdownContent?.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : 'Untitled Blog Post';

        // Extract subtitle/first paragraph
        const subtitleMatch = state.markdownContent?.match(/^(?!#)(.+)$/m);
        const subtitle = subtitleMatch ? subtitleMatch[1].substring(0, 150) : '';

        // Create visuals from frames
        const visuals: BlogVisual[] = state.frames.map((frame, index) => ({
            id: `image_${index}`,
            prompt: `Frame ${index + 1} from video`,
            caption: `Step ${index + 1}`,
            imageData: frame.dataUrl.split(',')[1], // Remove data:image/jpeg;base64, prefix
            status: 'complete' as const
        }));

        // Create metadata
        const metadata = `Video to Blog | ${new Date().toLocaleDateString()} | Tutorial`;

        return {
            title,
            subtitle,
            metadata,
            content: state.markdownContent || '',
            visuals
        };
    };

    // Publish handlers
    const handlePublish = () => {
        if (state.markdownContent && onPublish) {
            const post = createBlogPostResult();
            onPublish(post);
            setIsPublished(true);
        }
    };

    const handleSaveDraft = async () => {
        if (!state.markdownContent || !onSaveDraft) return;

        setIsSavingDraft(true);
        try {
            const post = createBlogPostResult();
            await onSaveDraft(post);
            setDraftSaved(true);
            setTimeout(() => setDraftSaved(false), 3000);
        } catch (error) {
            console.error('Failed to save draft:', error);
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleSchedulePost = async () => {
        if (!state.markdownContent || !onSchedule || !scheduleDate || !scheduleTime) return;

        setIsScheduling(true);
        try {
            const post = createBlogPostResult();
            const scheduledDate = new Date(`${scheduleDate}T${scheduleTime}`);
            await onSchedule(post, scheduledDate);
            setShowScheduleModal(false);
            setScheduleDate('');
            setScheduleTime('');
        } catch (error) {
            console.error('Failed to schedule post:', error);
        } finally {
            setIsScheduling(false);
        }
    };

    // Process content to replace image placeholders
    const processContent = (text: string) => {
        return text.replace(/\[\[IMAGE_(\d+)\]\]/g, (match, index) => {
            const frameIndex = parseInt(index, 10);
            const frame = state.frames[frameIndex];
            if (frame) {
                return `\n\n![Step ${frameIndex + 1}](${frame.dataUrl})\n\n`;
            }
            return '';
        });
    };

    // URL transform to allow data URLs (base64 images)
    const urlTransform = (url: string) => {
        if (url.startsWith('data:')) return url;
        if (url.startsWith('http')) return url;
        return url;
    };

    // Estimate reading time
    const getReadingTime = () => {
        if (!state.markdownContent) return 0;
        const wordCount = state.markdownContent.split(/\s+/).length;
        return Math.ceil(wordCount / 200);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/20">
                            <Video className="w-6 h-6 text-rose-400" />
                        </div>
                        Video to Blog
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Transform your video tutorials into beautifully formatted blog posts using AI
                    </p>
                </div>
                {state.status === 'complete' && (
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Start Over
                    </button>
                )}
            </div>

            {/* Idle State - Upload */}
            {state.status === 'idle' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Upload Area */}
                    <div className="p-8 rounded-2xl bg-slate-900/50 border border-white/5">
                        <div
                            className={`relative p-12 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
                                dragActive
                                    ? 'border-rose-500 bg-rose-500/10'
                                    : 'border-white/10 hover:border-rose-500/50 hover:bg-white/5'
                            }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                className="hidden"
                                accept="video/*"
                                onChange={handleChange}
                            />
                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 flex items-center justify-center mb-6">
                                    <FileVideo className="w-10 h-10 text-rose-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    Drop your video here
                                </h3>
                                <p className="text-slate-400 mb-6">
                                    or click to browse - MP4, WebM, MOV
                                </p>
                                <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-medium hover:shadow-lg hover:shadow-rose-500/25 transition-all">
                                    <Upload className="w-4 h-4 inline-block mr-2" />
                                    Select Video
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* How it works */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-xl bg-slate-900/50 border border-white/5">
                            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4">
                                <Video className="w-6 h-6 text-violet-400" />
                            </div>
                            <h3 className="font-bold text-white mb-2">1. Upload Video</h3>
                            <p className="text-sm text-slate-400">
                                Drag and drop any tutorial or screen recording video.
                            </p>
                        </div>
                        <div className="p-6 rounded-xl bg-slate-900/50 border border-white/5">
                            <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center mb-4">
                                <Settings className="w-6 h-6 text-rose-400" />
                            </div>
                            <h3 className="font-bold text-white mb-2">2. Configure</h3>
                            <p className="text-sm text-slate-400">
                                Choose length, tone, and target audience for your blog.
                            </p>
                        </div>
                        <div className="p-6 rounded-xl bg-slate-900/50 border border-white/5">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                                <FileText className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="font-bold text-white mb-2">3. Generate</h3>
                            <p className="text-sm text-slate-400">
                                Get a fully formatted blog post with embedded screenshots.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Processing Video */}
            {state.status === 'processing_video' && (
                <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 animate-in fade-in duration-500">
                    <div className="flex flex-col items-center text-center">
                        <div className="relative w-24 h-24 mb-8">
                            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                            <div
                                className="absolute inset-0 rounded-full border-4 border-rose-500 border-t-transparent animate-spin"
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg font-bold text-rose-400">{state.progress}%</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Analyzing Video</h2>
                        <p className="text-slate-400">
                            Extracting key frames from "{state.videoName}"...
                        </p>
                    </div>
                </div>
            )}

            {/* Configuration */}
            {state.status === 'configuring' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Preview of extracted frames */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Eye className="w-5 h-5 text-rose-400" />
                                Extracted Frames ({state.frames.length})
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowFramesModal(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition-all"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    View All
                                </button>
                                <button
                                    onClick={downloadAllScreenshots}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-sm transition-all"
                                >
                                    <Package className="w-4 h-4" />
                                    Download All
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                            {state.frames.slice(0, 8).map((frame, i) => (
                                <div
                                    key={i}
                                    className="aspect-video rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:border-rose-500/50 transition-all group relative"
                                    onClick={() => downloadSingleScreenshot(frame, i)}
                                >
                                    <img
                                        src={frame.dataUrl}
                                        alt={`Frame ${i + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Download className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            ))}
                            {state.frames.length > 8 && (
                                <button
                                    onClick={() => setShowFramesModal(true)}
                                    className="aspect-video rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                                >
                                    <span className="text-sm text-slate-400">+{state.frames.length - 8}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Configuration Panel */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className="w-full flex items-center justify-between text-left"
                        >
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Settings className="w-5 h-5 text-rose-400" />
                                Configuration
                            </h3>
                            {showConfig ? (
                                <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                        </button>

                        {showConfig && (
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Column */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-rose-400 font-semibold uppercase text-xs tracking-wider">
                                        <Sparkles className="w-4 h-4" /> Content Strategy
                                    </div>

                                    {/* Length */}
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-slate-300">
                                            Article Length
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {LENGTH_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setConfig({ ...config, length: opt.id })}
                                                    className={`p-3 rounded-xl text-center transition-all ${
                                                        config.length === opt.id
                                                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 border'
                                                            : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                                                    }`}
                                                >
                                                    <div className="font-medium">{opt.label}</div>
                                                    <div className="text-xs opacity-70">{opt.words}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tone */}
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-slate-300">
                                            Tone of Voice
                                        </label>
                                        <select
                                            value={config.tone}
                                            onChange={(e) => setConfig({ ...config, tone: e.target.value as VideoBlogTone })}
                                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        >
                                            {TONE_OPTIONS.map((tone) => (
                                                <option key={tone.id} value={tone.id} className="bg-slate-900">
                                                    {tone.label} - {tone.description}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-rose-400 font-semibold uppercase text-xs tracking-wider">
                                        <Target className="w-4 h-4" /> Audience & Structure
                                    </div>

                                    {/* Target Audience */}
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-slate-300">
                                            <Users className="w-4 h-4 inline-block mr-2" />
                                            Target Audience
                                        </label>
                                        <input
                                            type="text"
                                            value={config.targetAudience}
                                            onChange={(e) => setConfig({ ...config, targetAudience: e.target.value })}
                                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                            placeholder="e.g., Beginners, Senior Developers, Designers"
                                        />
                                    </div>

                                    {/* Include Conclusion */}
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                                                config.includeConclusion
                                                    ? 'bg-rose-500 border-rose-500'
                                                    : 'border-white/20 bg-white/5'
                                            }`}>
                                                {config.includeConclusion && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-slate-300">Include summary conclusion</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Generate Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleGenerate}
                            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold hover:shadow-lg hover:shadow-rose-500/25 transition-all transform hover:-translate-y-0.5"
                        >
                            <Sparkles className="w-5 h-5" />
                            Generate Blog Post
                        </button>
                    </div>
                </div>
            )}

            {/* Generating */}
            {state.status === 'generating_text' && (
                <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 animate-in fade-in duration-500">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-rose-500/25 animate-bounce">
                            <Sparkles className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Crafting Your Article</h2>
                        <p className="text-slate-400 max-w-md">
                            AI is writing a {config.length} {config.tone} blog post for {config.targetAudience}...
                        </p>
                    </div>
                </div>
            )}

            {/* Error */}
            {state.status === 'error' && (
                <div className="p-12 rounded-2xl bg-slate-900/50 border border-red-500/20 animate-in fade-in duration-500">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
                        <p className="text-slate-400 mb-8 max-w-md">{state.error}</p>
                        <button
                            onClick={handleReset}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Complete - Show Result */}
            {state.status === 'complete' && state.markdownContent && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Success Banner */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-3">
                            <div className="p-1 rounded-full bg-emerald-500/20">
                                <Check className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="font-medium text-emerald-300">
                                Success! Your blog post is ready.
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Clock className="w-4 h-4" />
                            {getReadingTime()} min read
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Copy */}
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                                copiedContent
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                            }`}
                        >
                            {copiedContent ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy Markdown
                                </>
                            )}
                        </button>

                        {/* Download Screenshots */}
                        <button
                            onClick={downloadAllScreenshots}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
                        >
                            <Package className="w-4 h-4" />
                            Download Screenshots
                        </button>

                        {/* View Frames */}
                        <button
                            onClick={() => setShowFramesModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
                        >
                            <ImageIcon className="w-4 h-4" />
                            View Frames
                        </button>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Save Draft Button */}
                        {onSaveDraft && (
                            <button
                                onClick={handleSaveDraft}
                                disabled={isSavingDraft}
                                className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all ${
                                    draftSaved
                                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                                }`}
                            >
                                {isSavingDraft ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : draftSaved ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {draftSaved ? "Saved!" : "Save Draft"}
                            </button>
                        )}

                        {/* Schedule Button */}
                        {onSchedule && (
                            <button
                                onClick={() => setShowScheduleModal(true)}
                                className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 rounded-xl text-violet-300 flex items-center gap-2 text-sm font-medium transition-all border border-violet-500/30"
                            >
                                <Calendar className="w-4 h-4" />
                                Schedule
                            </button>
                        )}

                        {/* Publish Button */}
                        {onPublish && (
                            <button
                                onClick={handlePublish}
                                disabled={isPublished}
                                className={`px-4 py-2 rounded-xl text-white flex items-center gap-2 text-sm font-bold transition-all ${
                                    isPublished
                                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                                        : 'bg-rose-500 hover:bg-rose-600'
                                }`}
                            >
                                {isPublished ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                {isPublished ? "Published!" : "Publish Now"}
                            </button>
                        )}
                    </div>

                    {/* Blog Content */}
                    <div className="rounded-2xl bg-slate-900/50 border border-white/5 overflow-hidden">
                        <div className="p-8 prose prose-invert prose-lg max-w-none">
                            <ReactMarkdown
                                urlTransform={urlTransform}
                                components={{
                                    h1: ({node, ...props}) => (
                                        <h1 {...props} className="text-3xl font-bold text-white mb-4" />
                                    ),
                                    h2: ({node, ...props}) => (
                                        <h2 {...props} className="text-2xl font-bold text-white mt-8 mb-4 pb-2 border-b border-white/10" />
                                    ),
                                    h3: ({node, ...props}) => (
                                        <h3 {...props} className="text-xl font-bold text-white mt-6 mb-3" />
                                    ),
                                    p: ({node, ...props}) => (
                                        <p {...props} className="text-slate-300 leading-relaxed mb-4" />
                                    ),
                                    img: ({node, src, alt, ...props}) => (
                                        <figure className="my-8">
                                            <div className="overflow-hidden rounded-xl border border-white/10 shadow-lg">
                                                <img
                                                    src={src}
                                                    alt={alt}
                                                    className="w-full h-auto"
                                                    {...props}
                                                />
                                            </div>
                                            {alt && alt !== 'Step Illustration' && (
                                                <figcaption className="text-center text-sm mt-3 text-slate-500 italic">
                                                    {alt}
                                                </figcaption>
                                            )}
                                        </figure>
                                    ),
                                    strong: ({node, ...props}) => (
                                        <strong {...props} className="text-white font-semibold" />
                                    ),
                                    code: ({node, ...props}) => (
                                        <code {...props} className="bg-white/10 text-rose-300 px-1.5 py-0.5 rounded font-mono text-sm" />
                                    ),
                                    ul: ({node, ...props}) => (
                                        <ul {...props} className="list-disc list-inside text-slate-300 space-y-2 mb-4" />
                                    ),
                                    ol: ({node, ...props}) => (
                                        <ol {...props} className="list-decimal list-inside text-slate-300 space-y-2 mb-4" />
                                    ),
                                    blockquote: ({node, ...props}) => (
                                        <blockquote {...props} className="border-l-4 border-rose-500/50 pl-4 my-4 text-slate-400 italic" />
                                    ),
                                }}
                            >
                                {processContent(state.markdownContent)}
                            </ReactMarkdown>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-white/5 bg-white/5">
                            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                Generated with Video to Blog AI - {config.tone} Tone - {config.length} Length
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Frames Modal */}
            {showFramesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowFramesModal(false)}
                    />
                    <div className="relative w-full max-w-4xl max-h-[80vh] p-6 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-rose-400" />
                                All Screenshots ({state.frames.length})
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={downloadAllScreenshots}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-sm transition-all"
                                >
                                    <Package className="w-4 h-4" />
                                    Download All
                                </button>
                                <button
                                    onClick={() => setShowFramesModal(false)}
                                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {state.frames.map((frame, i) => (
                                    <div
                                        key={i}
                                        className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-rose-500/50 transition-all"
                                        onClick={() => downloadSingleScreenshot(frame, i)}
                                    >
                                        <img
                                            src={frame.dataUrl}
                                            alt={`Frame ${i + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                                            <Download className="w-6 h-6 text-white mb-2" />
                                            <span className="text-white text-sm font-medium">Frame {i + 1}</span>
                                        </div>
                                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
                                            {i + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowScheduleModal(false)}
                    />
                    <div className="relative w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-violet-400" />
                            Schedule Post
                        </h3>

                        <p className="text-slate-400 text-sm mb-6">
                            Choose when you want this post to be automatically published.
                        </p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Time</label>
                                <input
                                    type="time"
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                                />
                            </div>
                        </div>

                        {scheduleDate && scheduleTime && (
                            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-6">
                                <p className="text-sm text-violet-300 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Will publish on {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString()}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowScheduleModal(false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSchedulePost}
                                disabled={!scheduleDate || !scheduleTime || isScheduling}
                                className="flex-1 py-3 bg-violet-500 hover:bg-violet-600 rounded-xl text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isScheduling ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoToBlog;
