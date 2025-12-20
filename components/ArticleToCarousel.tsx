/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { generateCarousel } from '../services/geminiService';
import { CarouselResult, SocialPost, ALL_PLATFORMS } from '../types';
import { postNow, extractHashtags, BlotatoPlatform } from '../services/blotatoService';
import {
    Link, Loader2, Download, Sparkles, AlertCircle, Palette, Globe, Layout, Copy, Check,
    ArrowLeft, ArrowRight, Image as ImageIcon, MessageSquare, Upload, X, ChevronDown, ChevronUp,
    Plus, Trash2, RefreshCw, Save, FolderOpen, Calendar, Clock, Send, Eye, EyeOff,
    Smartphone, Monitor, Tablet, Grid3X3, Layers, Wand2, Settings, Sliders, Target,
    TrendingUp, BarChart3, Users, Heart, Share2, Bookmark, Star, MoreHorizontal,
    Linkedin, Instagram, Facebook, Twitter, PanelLeft, Maximize, Minimize, Edit3,
    Shuffle, Lock, Unlock, Zap, FileText, Hash, Type, AlignLeft, AlignCenter, AlignRight,
    Bold, Italic, Underline, List, ListOrdered, Quote, Code, Heading1, Heading2,
    Youtube, Video, Radio
} from 'lucide-react';
import ImageViewer from './ImageViewer';
import SchedulePostModal from './SchedulePostModal';
import { SocialPlatform } from '../types';

// Platform configurations with optimal carousel specs - All 8 Blotato platforms
const PLATFORM_CONFIGS = [
    {
        id: 'twitter',
        name: 'X / Twitter',
        icon: Twitter,
        color: 'sky',
        aspectRatio: '16:9',
        maxSlides: 4,
        optimalSlides: '2-4',
        dimensions: '1200x675',
        captionLimit: 280,
        hashtagLimit: 3,
        tips: 'Concise, punchy text, trending topics'
    },
    {
        id: 'facebook',
        name: 'Facebook',
        icon: Facebook,
        color: 'blue',
        aspectRatio: '1:1',
        maxSlides: 10,
        optimalSlides: '5-8',
        dimensions: '1080x1080',
        captionLimit: 63206,
        hashtagLimit: 10,
        tips: 'Engaging stories, community-focused'
    },
    {
        id: 'instagram',
        name: 'Instagram',
        icon: Instagram,
        color: 'pink',
        aspectRatio: '1:1',
        maxSlides: 10,
        optimalSlides: '5-7',
        dimensions: '1080x1080',
        captionLimit: 2200,
        hashtagLimit: 30,
        tips: 'Visual-first, use emojis, strong CTA on last slide'
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        icon: Linkedin,
        color: 'indigo',
        aspectRatio: '1:1',
        maxSlides: 20,
        optimalSlides: '5-10',
        dimensions: '1080x1080',
        captionLimit: 3000,
        hashtagLimit: 5,
        tips: 'Use professional tone, include industry insights'
    },
    {
        id: 'bluesky',
        name: 'BlueSky',
        icon: Radio,
        color: 'cyan',
        aspectRatio: '16:9',
        maxSlides: 4,
        optimalSlides: '2-4',
        dimensions: '1200x675',
        captionLimit: 300,
        hashtagLimit: 5,
        tips: 'Authentic voice, community engagement'
    },
    {
        id: 'threads',
        name: 'Threads',
        icon: MessageSquare,
        color: 'slate',
        aspectRatio: '1:1',
        maxSlides: 10,
        optimalSlides: '3-5',
        dimensions: '1080x1080',
        captionLimit: 500,
        hashtagLimit: 10,
        tips: 'Conversational tone, text-focused'
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        icon: Video,
        color: 'rose',
        aspectRatio: '9:16',
        maxSlides: 10,
        optimalSlides: '3-5',
        dimensions: '1080x1920',
        captionLimit: 2200,
        hashtagLimit: 5,
        tips: 'Trendy, engaging, vertical format preferred'
    },
    {
        id: 'youtube',
        name: 'YouTube',
        icon: Youtube,
        color: 'red',
        aspectRatio: '16:9',
        maxSlides: 10,
        optimalSlides: '5-8',
        dimensions: '1920x1080',
        captionLimit: 5000,
        hashtagLimit: 15,
        tips: 'Thumbnail quality, detailed descriptions'
    },
];

// Visual style presets
const STYLE_PRESETS = [
    { id: 'corporate', name: 'Corporate Professional', description: 'Clean, business-ready design', colors: ['#1e3a5f', '#3d5a80', '#98c1d9'] },
    { id: 'bold', name: 'Bold & Vibrant', description: 'High contrast, attention-grabbing', colors: ['#ff6b6b', '#feca57', '#48dbfb'] },
    { id: 'minimal', name: 'Minimalist', description: 'Clean whitespace, elegant typography', colors: ['#ffffff', '#f8f9fa', '#212529'] },
    { id: 'dark', name: 'Dark Mode', description: 'Dark backgrounds, neon accents', colors: ['#0a0a0a', '#1a1a2e', '#00ff88'] },
    { id: 'gradient', name: 'Gradient Flow', description: 'Smooth color transitions', colors: ['#667eea', '#764ba2', '#f093fb'] },
    { id: 'retro', name: 'Retro Vintage', description: 'Nostalgic, warm aesthetic', colors: ['#d4a373', '#faedcd', '#ccd5ae'] },
];

// Slide count options
const SLIDE_COUNT_OPTIONS = [3, 4, 5, 6, 7, 8, 10];

// Languages
const LANGUAGES = [
    { label: "English", value: "English", flag: "🇺🇸" },
    { label: "Spanish", value: "Spanish", flag: "🇪🇸" },
    { label: "French", value: "French", flag: "🇫🇷" },
    { label: "German", value: "German", flag: "🇩🇪" },
    { label: "Portuguese", value: "Portuguese", flag: "🇧🇷" },
    { label: "Japanese", value: "Japanese", flag: "🇯🇵" },
    { label: "Chinese", value: "Chinese", flag: "🇨🇳" },
    { label: "Korean", value: "Korean", flag: "🇰🇷" },
];

const ArticleToCarousel: React.FC = () => {
    // Input State
    const [urlInput, setUrlInput] = useState('');
    const [prompt, setPrompt] = useState('');
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    
    // Platform & Style Configuration (Multi-platform selection)
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['twitter', 'linkedin', 'instagram']);
    const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0]);
    const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].value);
    const [slideCount, setSlideCount] = useState(5);

    // Toggle platform selection
    const togglePlatform = (platformId: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(platformId)
                ? prev.filter(p => p !== platformId)
                : [...prev, platformId]
        );
    };
    
    // Advanced Options
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [includeHook, setIncludeHook] = useState(true);
    const [includeCTA, setIncludeCTA] = useState(true);
    const [ctaText, setCtaText] = useState('Follow for more →');
    const [brandName, setBrandName] = useState('');
    const [includePageNumbers, setIncludePageNumbers] = useState(true);
    
    // A/B Testing
    const [enableABTesting, setEnableABTesting] = useState(false);
    const [abVariants, setAbVariants] = useState<CarouselResult[]>([]);
    
    // Generation State
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CarouselResult | null>(null);
    const [generatedCaptions, setGeneratedCaptions] = useState<SocialPost[]>([]);

    // Posting State
    const [isPosting, setIsPosting] = useState(false);
    const [postingPlatform, setPostingPlatform] = useState<string | null>(null);
    const [postResults, setPostResults] = useState<{platform: string, success: boolean, message: string}[]>([]);

    // UI State
    const [copiedCaption, setCopiedCaption] = useState(false);
    const [copiedPostIndex, setCopiedPostIndex] = useState<number | null>(null);
    const [fullScreenImage, setFullScreenImage] = useState<{src: string, alt: string} | null>(null);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'grid' | 'carousel' | 'editor'>('grid');
    const [showPlatformPicker, setShowPlatformPicker] = useState(false);
    
    // Scheduling State
    const [showScheduler, setShowScheduler] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    // Calendar Schedule Modal State
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    
    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                const base64Data = base64.split(',')[1];
                setSourceImage(base64Data);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!urlInput.trim() && !prompt.trim() && !sourceImage) {
            setError("Please provide at least a URL, a text prompt, or an image.");
            return;
        }

        if (selectedPlatforms.length === 0) {
            setError("Please select at least one platform.");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setAbVariants([]);
        setGeneratedCaptions([]);
        setPostResults([]);

        try {
            // Generate main carousel with multi-platform captions
            const platformNames = selectedPlatforms.map(id =>
                PLATFORM_CONFIGS.find(p => p.id === id)?.name || id
            );

            const data = await generateCarousel(
                urlInput,
                prompt,
                sourceImage,
                selectedStyle.name,
                selectedLanguage,
                platformNames,
                (stage) => setLoadingStage(stage)
            );
            setResult(data);
            setGeneratedCaptions(data.captions || []);

            // Generate A/B variant if enabled
            if (enableABTesting) {
                setLoadingStage('GENERATING A/B VARIANT...');
                const variantData = await generateCarousel(
                    urlInput,
                    prompt + " (Alternative version with different visual approach)",
                    sourceImage,
                    selectedStyle.name,
                    selectedLanguage,
                    platformNames,
                    () => {}
                );
                setAbVariants([variantData]);
            }
        } catch (err: any) {
            setError(err.message || "Failed to generate carousel.");
        } finally {
            setLoading(false);
        }
    };

    // Copy caption to clipboard
    const copyCaptionToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedPostIndex(index);
        setTimeout(() => setCopiedPostIndex(null), 2000);
    };

    // Post to individual platform via Blotato
    const handlePostToPlatform = async (platform: string, caption: string) => {
        if (!result || result.slides.length === 0) return;

        setIsPosting(true);
        setPostingPlatform(platform);

        try {
            // Get all slide images as base64
            const images = result.slides
                .filter(s => s.imageData)
                .map(s => s.imageData!);

            // Normalize platform name for Blotato
            const blotatoPlatform = platform.toLowerCase().replace('x / ', '').replace(' ', '') as BlotatoPlatform;

            // Post via Blotato API
            const postResult = await postNow(
                caption,
                [blotatoPlatform],
                images,
                extractHashtags(caption)
            );

            setPostResults(prev => [...prev, {
                platform,
                success: postResult.success,
                message: postResult.message
            }]);
        } catch (err: any) {
            setPostResults(prev => [...prev, {
                platform,
                success: false,
                message: err.message || 'Failed to post via Blotato'
            }]);
        } finally {
            setIsPosting(false);
            setPostingPlatform(null);
        }
    };

    // Post to all selected platforms
    const handlePostToAllPlatforms = async () => {
        if (!result || generatedCaptions.length === 0) return;

        for (const caption of generatedCaptions) {
            await handlePostToPlatform(caption.platform, caption.content);
        }
    };

    const copyCaption = () => {
        if (result?.caption) {
            navigator.clipboard.writeText(result.caption);
            setCopiedCaption(true);
            setTimeout(() => setCopiedCaption(false), 2000);
        }
    };

    const downloadSlide = (slideData: string, index: number, format: 'png' | 'jpg' = 'png') => {
        const link = document.createElement('a');
        link.href = `data:image/${format};base64,${slideData}`;
        link.download = `carousel-slide-${index + 1}.${format}`;
        link.click();
    };

    const downloadAllSlides = () => {
        if (!result) return;
        result.slides.forEach((slide, idx) => {
            if (slide.imageData) {
                setTimeout(() => downloadSlide(slide.imageData!, idx), idx * 500);
            }
        });
    };

    const regenerateSlide = async (index: number) => {
        // Placeholder for individual slide regeneration
        console.log('Regenerating slide', index);
    };

    return (
        <div className="space-y-8">
            {fullScreenImage && (
                <ImageViewer 
                    src={fullScreenImage.src} 
                    alt={fullScreenImage.alt} 
                    onClose={() => setFullScreenImage(null)} 
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500">
                            <Layout className="w-6 h-6 text-white" />
                        </div>
                        Carousel Creator
                    </h1>
                    <p className="text-slate-400 mt-1">Generate multi-slide visual narratives for social media</p>
                </div>
                
                {result && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Grid3X3 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('carousel')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'carousel' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Layers className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('editor')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'editor' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Edit3 className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Left Column - Configuration */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Platform Selection - Multi-Select */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-sky-400" />
                            Target Platforms
                            <span className="ml-2 px-2 py-0.5 bg-sky-500/20 text-sky-300 text-xs rounded-full">
                                {selectedPlatforms.length} selected
                            </span>
                        </h3>

                        {/* Multi-Select Platform Grid */}
                        <div className="space-y-2">
                            {PLATFORM_CONFIGS.map(platform => {
                                const Icon = platform.icon;
                                const isSelected = selectedPlatforms.includes(platform.id);
                                return (
                                    <button
                                        key={platform.id}
                                        onClick={() => togglePlatform(platform.id)}
                                        className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 border ${
                                            isSelected
                                                ? 'bg-sky-500/10 border-sky-500/30'
                                                : 'bg-slate-950/50 border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                                            isSelected
                                                ? 'bg-sky-500 border-sky-500'
                                                : 'border-slate-600'
                                        }`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>

                                        {/* Icon */}
                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-sky-500/20' : 'bg-slate-800'}`}>
                                            <Icon className={`w-5 h-5 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1">
                                            <div className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                                {platform.name}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {platform.aspectRatio} • Max {platform.maxSlides} slides • {platform.captionLimit} chars
                                            </div>
                                        </div>

                                        {/* Tips (show when selected) */}
                                        {isSelected && (
                                            <div className="hidden lg:block text-xs text-sky-300 max-w-[150px] text-right">
                                                💡 {platform.tips}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {selectedPlatforms.length === 0 && (
                            <p className="text-xs text-amber-400 flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" />
                                Please select at least one platform
                            </p>
                        )}
                    </div>

                    {/* Content Source */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-sky-400" />
                            Content Source
                        </h3>

                        {/* URL Input */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500 flex items-center gap-2">
                                <Link className="w-3 h-3" /> Source URL (optional)
                            </label>
                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="https://example.com/article"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500/50"
                            />
                        </div>

                        {/* Text Prompt */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500 flex items-center gap-2">
                                <MessageSquare className="w-3 h-3" /> Topic / Instructions
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="E.g., Create a carousel about '5 Tips for Remote Work' with a friendly tone..."
                                className="w-full h-24 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500/50 resize-none"
                            />
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500 flex items-center gap-2">
                                <Upload className="w-3 h-3" /> Reference Image (optional)
                            </label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-24 border border-dashed border-white/10 rounded-xl bg-slate-950/30 hover:bg-white/5 hover:border-sky-500/30 transition-all cursor-pointer flex items-center justify-center gap-3 group relative overflow-hidden"
                            >
                                {sourceImage ? (
                                    <>
                                        <img src={`data:image/png;base64,${sourceImage}`} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="Reference" />
                                        <div className="relative z-10 flex items-center gap-2">
                                            <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-xs text-white border border-white/10 font-bold flex items-center gap-2">
                                                <Check className="w-3 h-3 text-green-400" /> Image Loaded
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSourceImage(null); }}
                                                className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-full text-red-300"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="w-6 h-6 text-slate-500 group-hover:text-sky-400 transition-colors" />
                                        <div className="text-center">
                                            <p className="text-sm text-slate-400 group-hover:text-slate-300">Upload Context Image</p>
                                            <p className="text-[10px] text-slate-600">PNG / JPG Supported</p>
                                        </div>
                                    </>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </div>
                        </div>
                    </div>

                    {/* Style & Settings */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Palette className="w-5 h-5 text-sky-400" />
                            Style & Settings
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Style Preset */}
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Visual Style</label>
                                <select
                                    value={selectedStyle.id}
                                    onChange={(e) => setSelectedStyle(STYLE_PRESETS.find(s => s.id === e.target.value) || STYLE_PRESETS[0])}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-sky-500/50"
                                >
                                    {STYLE_PRESETS.map(style => (
                                        <option key={style.id} value={style.id}>{style.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Slide Count */}
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Number of Slides</label>
                                <select
                                    value={slideCount}
                                    onChange={(e) => setSlideCount(parseInt(e.target.value))}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-sky-500/50"
                                >
                                    {SLIDE_COUNT_OPTIONS.filter(n => {
                                        // Get the minimum maxSlides across selected platforms
                                        const minMaxSlides = selectedPlatforms.length > 0
                                            ? Math.min(...selectedPlatforms.map(id =>
                                                PLATFORM_CONFIGS.find(p => p.id === id)?.maxSlides || 10
                                              ))
                                            : 10;
                                        return n <= minMaxSlides;
                                    }).map(num => (
                                        <option key={num} value={num}>{num} Slides</option>
                                    ))}
                                </select>
                            </div>

                            {/* Language */}
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs text-slate-500">Language</label>
                                <select
                                    value={selectedLanguage}
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-sky-500/50"
                                >
                                    {LANGUAGES.map(lang => (
                                        <option key={lang.value} value={lang.value}>{lang.flag} {lang.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Style Preview */}
                        <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-1">
                                    {selectedStyle.colors.map((color, i) => (
                                        <div 
                                            key={i} 
                                            className="w-5 h-5 rounded-full border-2 border-slate-900"
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <div>
                                    <div className="text-sm text-white font-medium">{selectedStyle.name}</div>
                                    <div className="text-[10px] text-slate-500">{selectedStyle.description}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Options */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between text-white"
                        >
                            <span className="flex items-center gap-2 font-bold">
                                <Sliders className="w-5 h-5 text-sky-400" />
                                Advanced Options
                            </span>
                            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                        
                        {showAdvanced && (
                            <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                {/* Toggle Options */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300">Hook Slide (First)</span>
                                        <button
                                            onClick={() => setIncludeHook(!includeHook)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeHook ? 'bg-sky-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeHook ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300">CTA Slide (Last)</span>
                                        <button
                                            onClick={() => setIncludeCTA(!includeCTA)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeCTA ? 'bg-sky-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeCTA ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300">Page Numbers</span>
                                        <button
                                            onClick={() => setIncludePageNumbers(!includePageNumbers)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includePageNumbers ? 'bg-sky-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includePageNumbers ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-300">A/B Testing</span>
                                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] rounded font-bold">PRO</span>
                                        </div>
                                        <button
                                            onClick={() => setEnableABTesting(!enableABTesting)}
                                            className={`w-10 h-6 rounded-full transition-colors ${enableABTesting ? 'bg-sky-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${enableABTesting ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* CTA Text */}
                                {includeCTA && (
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500">CTA Text</label>
                                        <input
                                            type="text"
                                            value={ctaText}
                                            onChange={(e) => setCtaText(e.target.value)}
                                            placeholder="Follow for more →"
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200"
                                        />
                                    </div>
                                )}

                                {/* Brand Name */}
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-500">Brand Name (optional)</label>
                                    <input
                                        type="text"
                                        value={brandName}
                                        onChange={(e) => setBrandName(e.target.value)}
                                        placeholder="@yourbrand"
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading || selectedPlatforms.length === 0 || (!urlInput.trim() && !prompt.trim() && !sourceImage)}
                        className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {loadingStage || 'Generating...'}
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Generate Carousel
                                <span className="text-xs opacity-75">
                                    ({selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''})
                                </span>
                                {enableABTesting && <span className="text-xs opacity-75">(+ A/B Variant)</span>}
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                </div>

                {/* Right Column - Results */}
                <div className="lg:col-span-7 space-y-6">
                    {loading && (
                        <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col items-center justify-center">
                            <div className="w-20 h-20 relative mb-6">
                                <div className="absolute inset-0 border-4 border-sky-500/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-sky-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-sky-400 font-mono text-sm animate-pulse uppercase tracking-wider">{loadingStage}</p>
                            <p className="text-slate-500 text-xs mt-2">
                                Creating carousel for {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    )}

                    {result && !loading && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            {/* Toolbar */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/5">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-400">{result.slides.length} slides generated</span>
                                    {enableABTesting && abVariants.length > 0 && (
                                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                                            +1 A/B Variant
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowScheduler(!showScheduler)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors text-sm"
                                    >
                                        <Calendar className="w-4 h-4" />
                                        Schedule
                                    </button>
                                    <button
                                        onClick={downloadAllSlides}
                                        className="flex items-center gap-2 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download All
                                    </button>
                                </div>
                            </div>

                            {/* Scheduler Modal */}
                            {showScheduler && (
                                <div className="p-4 rounded-xl bg-slate-900/50 border border-sky-500/20 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-sky-400" />
                                        Schedule Post
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Date</label>
                                            <input
                                                type="date"
                                                value={scheduledDate}
                                                onChange={(e) => setScheduledDate(e.target.value)}
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Time</label>
                                            <input
                                                type="time"
                                                value={scheduledTime}
                                                onChange={(e) => setScheduledTime(e.target.value)}
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4">
                                        <button
                                            onClick={() => setShowScheduler(false)}
                                            className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium">
                                            Schedule
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Slides Grid View */}
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {result.slides.map((slide, idx) => (
                                        <div key={idx} className="group relative bg-slate-900 rounded-xl overflow-hidden border border-white/10 shadow-lg aspect-square">
                                            {slide.imageData ? (
                                                <img 
                                                    src={`data:image/png;base64,${slide.imageData}`} 
                                                    alt={`Slide ${slide.order}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-950">
                                                    <ImageIcon className="w-8 h-8 opacity-50" />
                                                </div>
                                            )}
                                            
                                            {/* Overlay Controls */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                                                {slide.imageData && (
                                                    <>
                                                        <button 
                                                            onClick={() => setFullScreenImage({src: `data:image/png;base64,${slide.imageData}`, alt: `Slide ${slide.order}`})}
                                                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium flex items-center gap-2"
                                                        >
                                                            <Maximize className="w-3 h-3" /> View
                                                        </button>
                                                        <button 
                                                            onClick={() => downloadSlide(slide.imageData!, idx)}
                                                            className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 rounded-lg text-sky-300 text-xs font-medium flex items-center gap-2"
                                                        >
                                                            <Download className="w-3 h-3" /> Download
                                                        </button>
                                                        <button 
                                                            onClick={() => regenerateSlide(idx)}
                                                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-amber-300 text-xs font-medium flex items-center gap-2"
                                                        >
                                                            <RefreshCw className="w-3 h-3" /> Regenerate
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            
                                            <div className="absolute top-2 left-2 bg-black/50 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 border border-white/5">
                                                {slide.order}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Carousel View */}
                            {viewMode === 'carousel' && (
                                <div className="space-y-4">
                                    <div className="relative aspect-square max-w-md mx-auto bg-slate-900 rounded-2xl overflow-hidden border border-white/10">
                                        {result.slides[activeSlideIndex]?.imageData ? (
                                            <img 
                                                src={`data:image/png;base64,${result.slides[activeSlideIndex].imageData}`} 
                                                alt={`Slide ${activeSlideIndex + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                <ImageIcon className="w-12 h-12 opacity-50" />
                                            </div>
                                        )}
                                        
                                        {/* Navigation Arrows */}
                                        <button
                                            onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
                                            disabled={activeSlideIndex === 0}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white disabled:opacity-30 transition-all"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setActiveSlideIndex(Math.min(result.slides.length - 1, activeSlideIndex + 1))}
                                            disabled={activeSlideIndex === result.slides.length - 1}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white disabled:opacity-30 transition-all"
                                        >
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                        
                                        {/* Slide Counter */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 backdrop-blur rounded-full text-sm text-white">
                                            {activeSlideIndex + 1} / {result.slides.length}
                                        </div>
                                    </div>
                                    
                                    {/* Thumbnail Strip */}
                                    <div className="flex justify-center gap-2">
                                        {result.slides.map((slide, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveSlideIndex(idx)}
                                                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                                                    activeSlideIndex === idx ? 'border-sky-500 scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                {slide.imageData ? (
                                                    <img 
                                                        src={`data:image/png;base64,${slide.imageData}`} 
                                                        alt={`Thumb ${idx + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                                        <span className="text-[10px] text-slate-500">{idx + 1}</span>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Multi-Platform Captions Section */}
                            <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-sky-400" />
                                        Social Media Captions
                                    </h3>
                                    {generatedCaptions.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handlePostToAllPlatforms}
                                                disabled={isPosting}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                            >
                                                {isPosting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Posting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="w-4 h-4" />
                                                        Post to All Platforms
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setShowScheduleModal(true)}
                                                disabled={!result}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                            >
                                                <Calendar className="w-4 h-4" />
                                                Schedule to Calendar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Post Results */}
                                {postResults.length > 0 && (
                                    <div className="mb-4 space-y-2">
                                        {postResults.map((result, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                                                    result.success
                                                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                                }`}
                                            >
                                                {result.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                                <span className="font-medium">{result.platform}:</span>
                                                <span>{result.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Generated Captions per Platform */}
                                {generatedCaptions.length > 0 ? (
                                    <div className="space-y-4">
                                        {generatedCaptions.map((post, idx) => {
                                            const platformConfig = PLATFORM_CONFIGS.find(
                                                p => p.name.toLowerCase().includes(post.platform.toLowerCase()) ||
                                                    post.platform.toLowerCase().includes(p.name.toLowerCase())
                                            );
                                            const Icon = platformConfig?.icon || MessageSquare;
                                            const isCurrentlyPosting = isPosting && postingPlatform === post.platform;

                                            return (
                                                <div
                                                    key={idx}
                                                    className="p-4 rounded-xl bg-slate-950/50 border border-white/5 hover:border-sky-500/30 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Icon className="w-4 h-4 text-sky-400" />
                                                            <span className="text-sm font-bold text-white">{post.platform}</span>
                                                            {platformConfig && (
                                                                <span className="text-[10px] text-slate-500">
                                                                    {post.content.length}/{platformConfig.captionLimit} chars
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => copyCaptionToClipboard(post.content, idx)}
                                                                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs"
                                                            >
                                                                {copiedPostIndex === idx ? (
                                                                    <>
                                                                        <Check className="w-3 h-3 text-green-400" />
                                                                        Copied!
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy className="w-3 h-3" />
                                                                        Copy
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handlePostToPlatform(post.platform, post.content)}
                                                                disabled={isPosting}
                                                                className="flex items-center gap-1 px-3 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                                            >
                                                                {isCurrentlyPosting ? (
                                                                    <>
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                        Posting...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Send className="w-3 h-3" />
                                                                        Post
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                        {post.content}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : result?.caption && (
                                    /* Fallback for single caption */
                                    <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5">
                                        <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                            {result.caption}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* A/B Variants */}
                            {enableABTesting && abVariants.length > 0 && (
                                <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                        <Shuffle className="w-5 h-5 text-amber-400" />
                                        A/B Variant
                                    </h3>
                                    <div className="grid grid-cols-4 gap-2">
                                        {abVariants[0].slides.slice(0, 4).map((slide, idx) => (
                                            <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-slate-900 border border-white/10">
                                                {slide.imageData && (
                                                    <img 
                                                        src={`data:image/png;base64,${slide.imageData}`} 
                                                        alt={`Variant Slide ${idx + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-amber-300 mt-3">
                                        💡 Test both versions to see which performs better with your audience
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {!result && !loading && (
                        <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-4">
                                <Layout className="w-8 h-8 text-sky-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Ready to Create</h3>
                            <p className="text-slate-500 max-w-md">
                                Enter a URL, topic, or upload an image to generate a stunning carousel for {
                                    selectedPlatforms.length > 0
                                        ? selectedPlatforms.map(id => PLATFORM_CONFIGS.find(p => p.id === id)?.name).join(', ')
                                        : 'your selected platforms'
                                }.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Schedule Post Modal */}
            <SchedulePostModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                onSuccess={() => {
                    setShowScheduleModal(false);
                }}
                title={urlInput || prompt || 'Carousel Post'}
                content={generatedCaptions}
                images={result?.slides.filter(s => s.imageData).map(s => `data:image/png;base64,${s.imageData}`) || []}
                hashtags={[]}
                sourceType="carousel"
                postType="carousel"
                preSelectedPlatforms={selectedPlatforms as SocialPlatform[]}
                allowMultiplePlatforms={true}
            />
        </div>
    );
};

export default ArticleToCarousel;