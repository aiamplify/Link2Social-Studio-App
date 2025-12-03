/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { generateBlogFromArticle, regenerateBlogVisual } from '../services/geminiService';
import { BlogPostResult, BlogVisual } from '../types';
import { 
    RefreshCw, Loader2, AlertCircle, FileText, Download, Copy, Check, Image as ImageIcon, Sparkles, 
    Globe, Palette, Maximize, Edit3, Code, Eye, Upload, Wand2, X, Send, Search, Type,
    ChevronDown, ChevronUp, Settings, Sliders, Target, TrendingUp, BarChart3, Users, Hash,
    BookOpen, Clock, Calendar, Save, FolderOpen, Plus, Trash2, Link, ExternalLink,
    Bold, Italic, Underline, List, ListOrdered, Quote, Heading1, Heading2, AlignLeft, AlignCenter,
    Zap, Award, Star, Heart, MessageSquare, Share2, Bookmark, MoreHorizontal, Filter,
    PieChart, Activity, MousePointer, Lightbulb, CheckCircle2, XCircle, Info, HelpCircle,
    Smartphone, Monitor, Tablet, Layout, Layers, Grid3X3, PanelLeft, ArrowRight, ArrowLeft
} from 'lucide-react';
import ImageViewer from './ImageViewer';

// Language options
const LANGUAGES = [
    { label: "English (US)", value: "English", flag: "🇺🇸" },
    { label: "Spanish", value: "Spanish", flag: "🇪🇸" },
    { label: "French", value: "French", flag: "🇫🇷" },
    { label: "German", value: "German", flag: "🇩🇪" },
    { label: "Portuguese", value: "Portuguese", flag: "🇧🇷" },
    { label: "Japanese", value: "Japanese", flag: "🇯🇵" },
    { label: "Chinese", value: "Chinese", flag: "🇨🇳" },
    { label: "Korean", value: "Korean", flag: "🇰🇷" },
    { label: "Italian", value: "Italian", flag: "🇮🇹" },
    { label: "Dutch", value: "Dutch", flag: "🇳🇱" },
];

// Visual style presets
const VISUAL_STYLES = [
    { id: 'modern', name: "Modern Digital Art", description: "Clean, contemporary illustrations", icon: Sparkles },
    { id: 'photo', name: "Photorealistic", description: "High-quality photo-like images", icon: ImageIcon },
    { id: 'minimal', name: "Minimalist Vector", description: "Simple, clean vector graphics", icon: Layout },
    { id: 'tech', name: "Tech Isometric", description: "3D isometric tech illustrations", icon: Grid3X3 },
    { id: 'sketch', name: "Hand-Drawn Sketch", description: "Artistic hand-drawn style", icon: Edit3 },
    { id: 'graphic', name: "Graphic Novel", description: "Comic book style visuals", icon: BookOpen },
    { id: 'custom', name: "Custom Style", description: "Define your own style", icon: Palette },
];

// Length options with word counts
const LENGTH_OPTIONS = [
    { id: 'short', label: "Short", words: "~500 words", description: "Quick read, key points only", icon: Zap },
    { id: 'medium', label: "Medium", words: "~1000 words", description: "Balanced depth and brevity", icon: Target },
    { id: 'long', label: "Long", words: "~2000 words", description: "Comprehensive coverage", icon: BookOpen },
    { id: 'extensive', label: "Extensive", words: "~3000 words", description: "In-depth analysis", icon: Award },
];

// Font options
const FONT_OPTIONS = [
    { label: "Merriweather (Serif)", value: "Merriweather, serif", category: "serif" },
    { label: "Inter (Sans)", value: "Inter, sans-serif", category: "sans" },
    { label: "Roboto (Sans)", value: "Roboto, sans-serif", category: "sans" },
    { label: "Open Sans (Sans)", value: "Open Sans, sans-serif", category: "sans" },
    { label: "Playfair Display (Serif)", value: "Playfair Display, serif", category: "serif" },
    { label: "Georgia (Serif)", value: "Georgia, serif", category: "serif" },
    { label: "Lato (Sans)", value: "Lato, sans-serif", category: "sans" },
    { label: "Source Sans Pro (Sans)", value: "Source Sans Pro, sans-serif", category: "sans" },
    { label: "JetBrains Mono (Mono)", value: "JetBrains Mono, monospace", category: "mono" },
    { label: "Custom", value: "custom", category: "custom" },
];

// Font size options
const FONT_SIZE_OPTIONS = [
    { label: "Small (14px)", value: "text-sm", pixels: "14px" },
    { label: "Medium (16px)", value: "text-base", pixels: "16px" },
    { label: "Large (18px)", value: "text-lg", pixels: "18px" },
    { label: "Extra Large (20px)", value: "text-xl", pixels: "20px" },
    { label: "2XL (24px)", value: "text-2xl", pixels: "24px" },
    { label: "Custom", value: "custom", pixels: "custom" },
];

// Line height options
const LINE_HEIGHT_OPTIONS = [
    { label: "Tight", value: "leading-tight", description: "1.25" },
    { label: "Snug", value: "leading-snug", description: "1.375" },
    { label: "Normal", value: "leading-normal", description: "1.5" },
    { label: "Relaxed", value: "leading-relaxed", description: "1.625" },
    { label: "Loose", value: "leading-loose", description: "2" },
];

// Image count options
const IMAGE_COUNT_OPTIONS = [0, 1, 2, 3, 5, 8, 10];

// Tone options
const TONE_OPTIONS = [
    { id: 'professional', label: 'Professional', description: 'Business-appropriate, authoritative' },
    { id: 'casual', label: 'Casual & Friendly', description: 'Conversational, approachable' },
    { id: 'educational', label: 'Educational', description: 'Informative, teaching-focused' },
    { id: 'persuasive', label: 'Persuasive', description: 'Compelling, action-oriented' },
    { id: 'storytelling', label: 'Storytelling', description: 'Narrative-driven, engaging' },
    { id: 'technical', label: 'Technical', description: 'Detailed, expert-level' },
];

// SEO Score factors
interface SEOScore {
    overall: number;
    titleLength: { score: number; message: string };
    metaDescription: { score: number; message: string };
    headings: { score: number; message: string };
    keywords: { score: number; message: string };
    readability: { score: number; message: string };
    images: { score: number; message: string };
}

interface BlogToBlogProps {
    onPublish?: (post: BlogPostResult) => void;
}

const BlogToBlog: React.FC<BlogToBlogProps> = ({ onPublish }) => {
    // Input Modes
    const [inputMode, setInputMode] = useState<'url' | 'file' | 'topic'>('url');
    
    // Inputs
    const [urlInput, setUrlInput] = useState('');
    const [fileContent, setFileContent] = useState('');
    const [instructions, setInstructions] = useState('');
    
    // Configuration
    const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].value);
    const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0]);
    const [customStyle, setCustomStyle] = useState('');
    const [selectedLength, setSelectedLength] = useState<'Short' | 'Medium' | 'Long' | 'Extensive'>('Medium');
    const [imageCount, setImageCount] = useState(3);
    const [selectedTone, setSelectedTone] = useState(TONE_OPTIONS[0]);
    
    // Font & Typography
    const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0].value);
    const [customFont, setCustomFont] = useState('');
    const [selectedFontSize, setSelectedFontSize] = useState(FONT_SIZE_OPTIONS[3].value); // Default to Extra Large (20px)
    const [customFontSize, setCustomFontSize] = useState('22');
    const [selectedLineHeight, setSelectedLineHeight] = useState(LINE_HEIGHT_OPTIONS[3].value); // Default to Relaxed

    // Styling Controls
    const [useBulletPoints, setUseBulletPoints] = useState(true);
    const [useNumberedLists, setUseNumberedLists] = useState(true);
    const [useBoldHeaders, setUseBoldHeaders] = useState(true);
    const [useBlockquotes, setUseBlockquotes] = useState(true);
    const [useHighlightedText, setUseHighlightedText] = useState(true);
    const [useHyperlinks, setUseHyperlinks] = useState(true);
    const [paragraphSpacing, setParagraphSpacing] = useState<'compact' | 'normal' | 'spacious'>('normal');

    // SEO Settings
    const [targetKeyword, setTargetKeyword] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [showSEOPanel, setShowSEOPanel] = useState(false);
    
    // Advanced Options
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [includeTableOfContents, setIncludeTableOfContents] = useState(true);
    const [includeFAQ, setIncludeFAQ] = useState(false);
    const [includeKeyTakeaways, setIncludeKeyTakeaways] = useState(true);
    const [authorName, setAuthorName] = useState('');
    const [categoryTag, setCategoryTag] = useState('');

    // Generation State
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<BlogPostResult | null>(null);
    
    // View Modes
    const [viewMode, setViewMode] = useState<'visual' | 'edit' | 'html' | 'seo'>('visual');
    const [editContent, setEditContent] = useState('');
    
    // UI State
    const [copiedContent, setCopiedContent] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState<{src: string, alt: string} | null>(null);
    const [activeImageId, setActiveImageId] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    
    // Refs
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calculate SEO Score
    const calculateSEOScore = (): SEOScore => {
        if (!result) {
            return {
                overall: 0,
                titleLength: { score: 0, message: 'No content yet' },
                metaDescription: { score: 0, message: 'No content yet' },
                headings: { score: 0, message: 'No content yet' },
                keywords: { score: 0, message: 'No content yet' },
                readability: { score: 0, message: 'No content yet' },
                images: { score: 0, message: 'No content yet' },
            };
        }

        const scores: SEOScore = {
            overall: 0,
            titleLength: { score: 0, message: '' },
            metaDescription: { score: 0, message: '' },
            headings: { score: 0, message: '' },
            keywords: { score: 0, message: '' },
            readability: { score: 0, message: '' },
            images: { score: 0, message: '' },
        };

        // Title length (50-60 chars optimal)
        const titleLen = result.title.length;
        if (titleLen >= 50 && titleLen <= 60) {
            scores.titleLength = { score: 100, message: 'Perfect length!' };
        } else if (titleLen >= 40 && titleLen <= 70) {
            scores.titleLength = { score: 75, message: 'Good, but could be optimized' };
        } else {
            scores.titleLength = { score: 50, message: titleLen < 40 ? 'Too short' : 'Too long' };
        }

        // Meta description (150-160 chars optimal)
        const metaLen = metaDescription.length;
        if (metaLen >= 150 && metaLen <= 160) {
            scores.metaDescription = { score: 100, message: 'Perfect length!' };
        } else if (metaLen >= 120 && metaLen <= 180) {
            scores.metaDescription = { score: 75, message: 'Good, but could be optimized' };
        } else if (metaLen === 0) {
            scores.metaDescription = { score: 25, message: 'Missing meta description' };
        } else {
            scores.metaDescription = { score: 50, message: metaLen < 120 ? 'Too short' : 'Too long' };
        }

        // Headings check
        const h2Count = (editContent.match(/^## /gm) || []).length;
        const h3Count = (editContent.match(/^### /gm) || []).length;
        if (h2Count >= 3 && h3Count >= 2) {
            scores.headings = { score: 100, message: 'Great heading structure!' };
        } else if (h2Count >= 2) {
            scores.headings = { score: 75, message: 'Add more subheadings' };
        } else {
            scores.headings = { score: 50, message: 'Needs more headings' };
        }

        // Keyword presence
        if (targetKeyword) {
            const keywordCount = (editContent.toLowerCase().match(new RegExp(targetKeyword.toLowerCase(), 'g')) || []).length;
            const density = (keywordCount / editContent.split(' ').length) * 100;
            if (density >= 1 && density <= 2.5) {
                scores.keywords = { score: 100, message: `Keyword density: ${density.toFixed(1)}%` };
            } else if (density > 0) {
                scores.keywords = { score: 75, message: `Keyword density: ${density.toFixed(1)}%` };
            } else {
                scores.keywords = { score: 25, message: 'Keyword not found' };
            }
        } else {
            scores.keywords = { score: 50, message: 'No target keyword set' };
        }

        // Readability (simple check based on sentence length)
        const sentences = editContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = sentences.reduce((acc, s) => acc + s.split(' ').length, 0) / sentences.length;
        if (avgSentenceLength <= 20) {
            scores.readability = { score: 100, message: 'Easy to read!' };
        } else if (avgSentenceLength <= 25) {
            scores.readability = { score: 75, message: 'Fairly readable' };
        } else {
            scores.readability = { score: 50, message: 'Sentences too long' };
        }

        // Images
        const imageCountInPost = result.visuals.filter(v => v.imageData).length;
        if (imageCountInPost >= 3) {
            scores.images = { score: 100, message: `${imageCountInPost} images - great!` };
        } else if (imageCountInPost >= 1) {
            scores.images = { score: 75, message: 'Add more images' };
        } else {
            scores.images = { score: 25, message: 'No images' };
        }

        // Calculate overall
        scores.overall = Math.round(
            (scores.titleLength.score + scores.metaDescription.score + scores.headings.score + 
             scores.keywords.score + scores.readability.score + scores.images.score) / 6
        );

        return scores;
    };

    const seoScore = calculateSEOScore();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                setFileContent(text);
            };
            reader.readAsText(file);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (inputMode === 'url' && !urlInput.trim()) {
            setError("Please provide a valid URL.");
            return;
        }
        if (inputMode === 'file' && !fileContent.trim()) {
            setError("Please upload a text file with content.");
            return;
        }
        if (inputMode === 'topic' && !instructions.trim()) {
            setError("Please provide a topic or instructions for research.");
            return;
        }
        
        setLoading(true);
        setError(null);
        setResult(null);
        setIsPublished(false);
        setViewMode('visual');
        
        try {
            const styleToUse = selectedStyle.id === 'custom' ? customStyle : selectedStyle.name;
            
            let source: { type: 'url' | 'text' | 'topic', content: string };
            if (inputMode === 'url') {
                source = { type: 'url', content: urlInput };
            } else if (inputMode === 'file') {
                source = { type: 'text', content: fileContent };
            } else {
                source = { type: 'topic', content: instructions };
            }

            const data = await generateBlogFromArticle(
                source,
                instructions,
                selectedLength,
                imageCount,
                styleToUse, 
                selectedLanguage, 
                (stage) => setLoadingStage(stage)
            );
            setResult(data);
            setEditContent(data.content);
            
            // Auto-generate meta description if empty
            if (!metaDescription && data.subtitle) {
                setMetaDescription(data.subtitle.substring(0, 160));
            }
        } catch (err: any) {
            setError(err.message || "Failed to remix blog post.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateImage = async (visual: BlogVisual) => {
        setRegeneratingId(visual.id);
        try {
            const styleToUse = selectedStyle.id === 'custom' ? customStyle : selectedStyle.name;
            const newData = await regenerateBlogVisual(visual, styleToUse);
            if (newData && result) {
                const updatedVisuals = result.visuals.map(v => 
                    v.id === visual.id ? { ...v, imageData: newData } : v
                );
                setResult({ ...result, visuals: updatedVisuals });
            }
        } catch (e) {
            console.error("Failed to regenerate", e);
        } finally {
            setRegeneratingId(null);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && activeImageId && result) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                const updatedVisuals = result.visuals.map(v => 
                    v.id === activeImageId ? { ...v, imageData: base64 } : v
                );
                setResult({ ...result, visuals: updatedVisuals });
                setActiveImageId(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerImageUpload = (id: string) => {
        setActiveImageId(id);
        setTimeout(() => imageInputRef.current?.click(), 100);
    };

    const copyHtml = () => {
        if (!result) return;
        const html = generateHtmlCode();
        navigator.clipboard.writeText(html);
        setCopiedContent(true);
        setTimeout(() => setCopiedContent(false), 2000);
    };
    
    const handlePublish = () => {
        if (result && onPublish) {
            const finalPost = { ...result, content: editContent };
            onPublish(finalPost);
            setIsPublished(true);
        }
    };

    const getActiveFont = () => {
        return selectedFont === 'custom' ? customFont : selectedFont;
    };

    const getActiveFontSize = () => {
        if (selectedFontSize === 'custom') {
            return `${customFontSize}px`;
        }
        // Map Tailwind classes to CSS values
        const sizeMap: Record<string, string> = {
            'text-sm': '14px',
            'text-base': '16px',
            'text-lg': '18px',
            'text-xl': '20px',
            'text-2xl': '24px',
        };
        return sizeMap[selectedFontSize] || '20px';
    };

    const getActiveLineHeight = () => {
        const heightMap: Record<string, string> = {
            'leading-tight': '1.25',
            'leading-snug': '1.375',
            'leading-normal': '1.5',
            'leading-relaxed': '1.625',
            'leading-loose': '2',
        };
        return heightMap[selectedLineHeight] || '1.625';
    };

    const getParagraphMargin = () => {
        const marginMap: Record<string, string> = {
            'compact': '1rem',
            'normal': '1.5rem',
            'spacious': '2rem',
        };
        return marginMap[paragraphSpacing] || '1.5rem';
    };

    const generateHtmlCode = () => {
        if (!result) return "";
        const font = getActiveFont();
        
        let html = `<!-- Blog Post: ${result.title} -->\n`;
        html += `<article class="blog-content" style="font-family: ${font};">\n`;
        html += `  <h1>${result.title}</h1>\n`;
        if (result.subtitle) {
            html += `  <p class="subtitle">${result.subtitle}</p>\n`;
        }
        html += `  <div class="meta">${result.metadata}</div>\n`;
        html += `  <!-- Content -->\n`;
        html += `  ${editContent.replace(/\n/g, '\n  ')}\n`;
        html += `</article>`;
        
        return html;
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'emerald';
        if (score >= 60) return 'amber';
        return 'red';
    };

    const renderContentWithImages = () => {
        if (!result) return null;

        const parts = editContent.split(/(\[\[IMAGE_\d+\]\])/g);
        const contentStyle = {
            fontFamily: getActiveFont(),
            fontSize: getActiveFontSize(),
            lineHeight: getActiveLineHeight(),
        };
        const paragraphMargin = getParagraphMargin();

        return (
            <div className="text-slate-300" style={contentStyle}>
                {parts.map((part, idx) => {
                    const match = part.match(/\[\[IMAGE_(\d+)\]\]/);
                    if (match) {
                        const imgIndex = parseInt(match[1]);
                        const visual = result.visuals.find(v => v.id === `image_${imgIndex}`);

                        if (visual) {
                            return (
                                <div key={idx} className="my-12 group relative rounded-xl overflow-hidden shadow-lg border border-white/10 bg-slate-950">
                                    {visual.imageData ? (
                                        <img src={`data:image/png;base64,${visual.imageData}`} alt={visual.caption} className="w-full h-auto object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-64 w-full bg-slate-900 text-slate-500 text-sm">Generating Visual...</div>
                                    )}

                                    <div className="py-3 px-4 text-center text-sm font-medium text-slate-400 bg-slate-900/80 border-t border-white/5 italic">
                                        {visual.caption}
                                    </div>

                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm z-10">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleRegenerateImage(visual)}
                                                disabled={regeneratingId === visual.id}
                                                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-white text-xs font-bold flex items-center gap-2 transition-colors"
                                            >
                                                {regeneratingId === visual.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                Re-Roll
                                            </button>
                                            <button
                                                onClick={() => triggerImageUpload(visual.id)}
                                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-bold flex items-center gap-2 transition-colors border border-white/10"
                                            >
                                                <Upload className="w-3 h-3" /> Replace
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    } else {
                        return (
                            <span key={idx} className="prose prose-invert max-w-none">
                                {part.split('\n').map((line, i) => {
                                    if (!line.trim()) return <br key={i}/>;
                                    if (line.startsWith('# ')) return null;

                                    // Headers
                                    if (line.startsWith('## ')) {
                                        return (
                                            <h2
                                                key={i}
                                                className="text-2xl mt-12 mb-6 text-white"
                                                style={{ fontWeight: useBoldHeaders ? 'bold' : 'normal' }}
                                            >
                                                {line.replace('## ', '')}
                                            </h2>
                                        );
                                    }
                                    if (line.startsWith('### ')) {
                                        return (
                                            <h3
                                                key={i}
                                                className="text-xl mt-10 mb-4 text-slate-200"
                                                style={{ fontWeight: useBoldHeaders ? 'bold' : 'normal' }}
                                            >
                                                {line.replace('### ', '')}
                                            </h3>
                                        );
                                    }

                                    // Bullet points
                                    if (line.startsWith('- ')) {
                                        if (!useBulletPoints) {
                                            // Render as paragraph if bullet points disabled
                                            return (
                                                <p key={i} style={{ marginBottom: paragraphMargin }}>
                                                    {line.replace('- ', '')}
                                                </p>
                                            );
                                        }
                                        return (
                                            <li key={i} className="ml-4 list-disc mb-3 pl-2">
                                                {line.replace('- ', '')}
                                            </li>
                                        );
                                    }

                                    // Numbered lists
                                    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
                                    if (numberedMatch) {
                                        if (!useNumberedLists) {
                                            return (
                                                <p key={i} style={{ marginBottom: paragraphMargin }}>
                                                    {numberedMatch[2]}
                                                </p>
                                            );
                                        }
                                        return (
                                            <li key={i} className="ml-4 list-decimal mb-3 pl-2">
                                                {numberedMatch[2]}
                                            </li>
                                        );
                                    }

                                    // Blockquotes
                                    if (line.startsWith('> ')) {
                                        if (!useBlockquotes) {
                                            return (
                                                <p key={i} className="italic" style={{ marginBottom: paragraphMargin }}>
                                                    {line.replace('> ', '')}
                                                </p>
                                            );
                                        }
                                        return (
                                            <blockquote key={i} className="border-l-4 border-orange-500 pl-4 my-6 italic text-slate-400">
                                                {line.replace('> ', '')}
                                            </blockquote>
                                        );
                                    }

                                    // Regular paragraphs with rich text
                                    let richText = line;

                                    // Bold text
                                    richText = richText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

                                    // Highlighted text (blue span)
                                    if (useHighlightedText) {
                                        richText = richText.replace(/<span class="blue">(.*?)<\/span>/g, '<span class="text-orange-400 font-semibold">$1</span>');
                                    } else {
                                        richText = richText.replace(/<span class="blue">(.*?)<\/span>/g, '$1');
                                    }

                                    // Underlined text
                                    richText = richText.replace(/<u>(.*?)<\/u>/g, '<span class="underline decoration-orange-500 decoration-2 underline-offset-4">$1</span>');

                                    // Hyperlinks
                                    if (useHyperlinks) {
                                        richText = richText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-orange-400 hover:text-orange-300 underline" target="_blank" rel="noopener noreferrer">$1</a>');
                                    } else {
                                        richText = richText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
                                    }

                                    return <p key={i} style={{ marginBottom: paragraphMargin }} dangerouslySetInnerHTML={{ __html: richText }} />;
                                })}
                            </span>
                        );
                    }
                })}
            </div>
        );
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
            
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
                            <Edit3 className="w-6 h-6 text-white" />
                        </div>
                        Blog Remix Studio
                    </h1>
                    <p className="text-slate-400 mt-1">Generate comprehensive blog posts with AI-powered writing and SEO optimization</p>
                </div>
                
                {result && (
                    <div className="flex items-center gap-2">
                        <div className={`px-3 py-1.5 rounded-full bg-${getScoreColor(seoScore.overall)}-500/20 border border-${getScoreColor(seoScore.overall)}-500/30`}>
                            <span className={`text-sm font-bold text-${getScoreColor(seoScore.overall)}-400`}>
                                SEO: {seoScore.overall}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Left Column - Configuration */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Source Type Selection */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-orange-400" />
                            Content Source
                        </h3>

                        <div className="flex gap-2 p-1 bg-slate-950/50 rounded-xl">
                            <button
                                onClick={() => setInputMode('url')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    inputMode === 'url' 
                                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                                        : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                <Link className="w-4 h-4" /> URL
                            </button>
                            <button
                                onClick={() => setInputMode('file')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    inputMode === 'file' 
                                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                                        : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                <Upload className="w-4 h-4" /> File
                            </button>
                            <button
                                onClick={() => setInputMode('topic')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    inputMode === 'topic' 
                                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                                        : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                <Search className="w-4 h-4" /> Topic
                            </button>
                        </div>

                        {/* Input Fields */}
                        {inputMode === 'url' && (
                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="https://example.com/blog/article"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-orange-500/50"
                            />
                        )}

                        {inputMode === 'file' && (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-24 border border-dashed border-white/10 rounded-xl bg-slate-950/30 hover:bg-white/5 hover:border-orange-500/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                            >
                                <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                                {fileContent ? (
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                        <Check className="w-4 h-4" /> File Loaded ({fileContent.length} chars)
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6 text-slate-500" />
                                        <span className="text-sm text-slate-400">Click to upload .TXT or .MD</span>
                                    </>
                                )}
                            </div>
                        )}

                        {inputMode === 'topic' && (
                            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <p className="text-xs text-orange-300 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4" />
                                    AI will research this topic using Google Search
                                </p>
                            </div>
                        )}

                        {/* Instructions */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500">
                                {inputMode === 'topic' ? 'Topic & Instructions' : 'Writing Instructions'}
                            </label>
                            <textarea
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder={inputMode === 'topic' 
                                    ? "Describe the topic you want researched and how the post should be written..." 
                                    : "Describe how you want the post rewritten (e.g. 'More professional tone', 'Focus on key stats')..."
                                }
                                className="w-full h-24 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-orange-500/50 resize-none"
                            />
                        </div>
                    </div>

                    {/* Content Settings */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Settings className="w-5 h-5 text-orange-400" />
                            Content Settings
                        </h3>

                        {/* Length Selection */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500">Article Length</label>
                            <div className="grid grid-cols-4 gap-2">
                                {LENGTH_OPTIONS.map(opt => {
                                    const Icon = opt.icon;
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => setSelectedLength(opt.label as any)}
                                            className={`p-3 rounded-xl text-center transition-all ${
                                                selectedLength === opt.label
                                                    ? 'bg-orange-500/20 border border-orange-500/30'
                                                    : 'bg-slate-950/50 border border-white/5 hover:border-white/10'
                                            }`}
                                        >
                                            <Icon className={`w-4 h-4 mx-auto mb-1 ${selectedLength === opt.label ? 'text-orange-400' : 'text-slate-500'}`} />
                                            <div className="text-xs text-white font-medium">{opt.label}</div>
                                            <div className="text-[10px] text-slate-500">{opt.words}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tone & Language */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Writing Tone</label>
                                <select
                                    value={selectedTone.id}
                                    onChange={(e) => setSelectedTone(TONE_OPTIONS.find(t => t.id === e.target.value) || TONE_OPTIONS[0])}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-orange-500/50"
                                >
                                    {TONE_OPTIONS.map(tone => (
                                        <option key={tone.id} value={tone.id}>{tone.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Language</label>
                                <select
                                    value={selectedLanguage}
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-orange-500/50"
                                >
                                    {LANGUAGES.map(lang => (
                                        <option key={lang.value} value={lang.value}>{lang.flag} {lang.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Visual Style & Images */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Visual Style</label>
                                <select
                                    value={selectedStyle.id}
                                    onChange={(e) => setSelectedStyle(VISUAL_STYLES.find(s => s.id === e.target.value) || VISUAL_STYLES[0])}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-orange-500/50"
                                >
                                    {VISUAL_STYLES.map(style => (
                                        <option key={style.id} value={style.id}>{style.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Number of Images</label>
                                <select
                                    value={imageCount}
                                    onChange={(e) => setImageCount(parseInt(e.target.value))}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-orange-500/50"
                                >
                                    {IMAGE_COUNT_OPTIONS.map(num => (
                                        <option key={num} value={num}>{num} Images</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedStyle.id === 'custom' && (
                            <input
                                type="text"
                                value={customStyle}
                                onChange={(e) => setCustomStyle(e.target.value)}
                                placeholder="Describe your custom visual style..."
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200"
                            />
                        )}
                    </div>

                    {/* SEO Settings */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <button
                            onClick={() => setShowSEOPanel(!showSEOPanel)}
                            className="w-full flex items-center justify-between text-white"
                        >
                            <span className="flex items-center gap-2 font-bold">
                                <TrendingUp className="w-5 h-5 text-orange-400" />
                                SEO Optimization
                                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] rounded font-bold">PRO</span>
                            </span>
                            {showSEOPanel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>

                        {showSEOPanel && (
                            <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-500">Target Keyword</label>
                                    <input
                                        type="text"
                                        value={targetKeyword}
                                        onChange={(e) => setTargetKeyword(e.target.value)}
                                        placeholder="e.g., AI content creation"
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-500">Meta Description ({metaDescription.length}/160)</label>
                                    <textarea
                                        value={metaDescription}
                                        onChange={(e) => setMetaDescription(e.target.value.substring(0, 160))}
                                        placeholder="Brief description for search engines..."
                                        className="w-full h-20 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Advanced Options */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between text-white"
                        >
                            <span className="flex items-center gap-2 font-bold">
                                <Sliders className="w-5 h-5 text-orange-400" />
                                Advanced Options
                            </span>
                            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>

                        {showAdvanced && (
                            <div className="space-y-6 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                {/* Content Sections */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Content Sections</h4>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300">Table of Contents</span>
                                        <button
                                            onClick={() => setIncludeTableOfContents(!includeTableOfContents)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeTableOfContents ? 'bg-orange-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeTableOfContents ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300">Key Takeaways Section</span>
                                        <button
                                            onClick={() => setIncludeKeyTakeaways(!includeKeyTakeaways)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeKeyTakeaways ? 'bg-orange-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeKeyTakeaways ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300">FAQ Section</span>
                                        <button
                                            onClick={() => setIncludeFAQ(!includeFAQ)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeFAQ ? 'bg-orange-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeFAQ ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Author & Category */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metadata</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-500">Author Name</label>
                                            <input
                                                type="text"
                                                value={authorName}
                                                onChange={(e) => setAuthorName(e.target.value)}
                                                placeholder="Your name"
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-500">Category</label>
                                            <input
                                                type="text"
                                                value={categoryTag}
                                                onChange={(e) => setCategoryTag(e.target.value)}
                                                placeholder="e.g., Technology"
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Typography Section */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Type className="w-4 h-4" />
                                        Typography
                                    </h4>

                                    {/* Font Family */}
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500">Font Family</label>
                                        <select
                                            value={selectedFont}
                                            onChange={(e) => setSelectedFont(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-orange-500/50"
                                        >
                                            {FONT_OPTIONS.map(font => (
                                                <option key={font.value} value={font.value}>{font.label}</option>
                                            ))}
                                        </select>
                                        {selectedFont === 'custom' && (
                                            <input
                                                type="text"
                                                value={customFont}
                                                onChange={(e) => setCustomFont(e.target.value)}
                                                placeholder="Enter font family (e.g., Arial, Helvetica)"
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 mt-2"
                                            />
                                        )}
                                    </div>

                                    {/* Font Size */}
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500">Font Size</label>
                                        <select
                                            value={selectedFontSize}
                                            onChange={(e) => setSelectedFontSize(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-orange-500/50"
                                        >
                                            {FONT_SIZE_OPTIONS.map(size => (
                                                <option key={size.value} value={size.value}>{size.label}</option>
                                            ))}
                                        </select>
                                        {selectedFontSize === 'custom' && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    type="number"
                                                    value={customFontSize}
                                                    onChange={(e) => setCustomFontSize(e.target.value)}
                                                    placeholder="Size"
                                                    min="10"
                                                    max="48"
                                                    className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200"
                                                />
                                                <span className="text-sm text-slate-500">px</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Line Height */}
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500">Line Height</label>
                                        <select
                                            value={selectedLineHeight}
                                            onChange={(e) => setSelectedLineHeight(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-orange-500/50"
                                        >
                                            {LINE_HEIGHT_OPTIONS.map(height => (
                                                <option key={height.value} value={height.value}>{height.label} ({height.description})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Paragraph Spacing */}
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500">Paragraph Spacing</label>
                                        <div className="flex gap-2">
                                            {(['compact', 'normal', 'spacious'] as const).map((spacing) => (
                                                <button
                                                    key={spacing}
                                                    onClick={() => setParagraphSpacing(spacing)}
                                                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                                                        paragraphSpacing === spacing
                                                            ? 'bg-orange-500 text-white'
                                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                    }`}
                                                >
                                                    {spacing}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Formatting Elements */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <List className="w-4 h-4" />
                                        Formatting Elements
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                                            <span className="text-sm text-slate-300 flex items-center gap-2">
                                                <List className="w-4 h-4 text-orange-400" />
                                                Bullet Points
                                            </span>
                                            <button
                                                onClick={() => setUseBulletPoints(!useBulletPoints)}
                                                className={`w-10 h-6 rounded-full transition-colors ${useBulletPoints ? 'bg-orange-500' : 'bg-slate-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${useBulletPoints ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                                            <span className="text-sm text-slate-300 flex items-center gap-2">
                                                <ListOrdered className="w-4 h-4 text-orange-400" />
                                                Numbered Lists
                                            </span>
                                            <button
                                                onClick={() => setUseNumberedLists(!useNumberedLists)}
                                                className={`w-10 h-6 rounded-full transition-colors ${useNumberedLists ? 'bg-orange-500' : 'bg-slate-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${useNumberedLists ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                                            <span className="text-sm text-slate-300 flex items-center gap-2">
                                                <Bold className="w-4 h-4 text-orange-400" />
                                                Bold Headers
                                            </span>
                                            <button
                                                onClick={() => setUseBoldHeaders(!useBoldHeaders)}
                                                className={`w-10 h-6 rounded-full transition-colors ${useBoldHeaders ? 'bg-orange-500' : 'bg-slate-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${useBoldHeaders ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                                            <span className="text-sm text-slate-300 flex items-center gap-2">
                                                <Quote className="w-4 h-4 text-orange-400" />
                                                Blockquotes
                                            </span>
                                            <button
                                                onClick={() => setUseBlockquotes(!useBlockquotes)}
                                                className={`w-10 h-6 rounded-full transition-colors ${useBlockquotes ? 'bg-orange-500' : 'bg-slate-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${useBlockquotes ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                                            <span className="text-sm text-slate-300 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-orange-400" />
                                                Highlighted Text
                                            </span>
                                            <button
                                                onClick={() => setUseHighlightedText(!useHighlightedText)}
                                                className={`w-10 h-6 rounded-full transition-colors ${useHighlightedText ? 'bg-orange-500' : 'bg-slate-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${useHighlightedText ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                                            <span className="text-sm text-slate-300 flex items-center gap-2">
                                                <Link className="w-4 h-4 text-orange-400" />
                                                Hyperlinks
                                            </span>
                                            <button
                                                onClick={() => setUseHyperlinks(!useHyperlinks)}
                                                className={`w-10 h-6 rounded-full transition-colors ${useHyperlinks ? 'bg-orange-500' : 'bg-slate-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${useHyperlinks ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading || (inputMode === 'url' && !urlInput) || (inputMode === 'file' && !fileContent) || (inputMode === 'topic' && !instructions)}
                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {loadingStage || 'Generating...'}
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-5 h-5" />
                                Generate Blog Post
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
                                <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-orange-400 font-mono text-sm animate-pulse uppercase tracking-wider">{loadingStage}</p>
                            <p className="text-slate-500 text-xs mt-2">Creating your {selectedLength.toLowerCase()} blog post</p>
                        </div>
                    )}

                    {result && !loading && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            {/* Toolbar */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/5 sticky top-0 z-30 backdrop-blur-xl">
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => setViewMode('visual')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'visual' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Eye className="w-4 h-4" /> Preview
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('edit')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'edit' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Edit3 className="w-4 h-4" /> Edit
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('html')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'html' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Code className="w-4 h-4" /> HTML
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('seo')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'seo' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <TrendingUp className="w-4 h-4" /> SEO
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onPublish && (
                                        <button 
                                            onClick={handlePublish}
                                            disabled={isPublished}
                                            className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 text-sm font-bold transition-all ${isPublished ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-orange-500 hover:bg-orange-600'}`}
                                        >
                                            {isPublished ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                            {isPublished ? "Published!" : "Publish"}
                                        </button>
                                    )}
                                    {viewMode === 'html' && (
                                        <button onClick={copyHtml} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-slate-300 flex items-center gap-2 text-sm font-medium">
                                            {copiedContent ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                            {copiedContent ? "Copied" : "Copy"}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Visual Preview */}
                            {viewMode === 'visual' && (
                                <div className="p-8 rounded-2xl bg-slate-900/50 border border-white/5">
                                    <div className="max-w-3xl mx-auto">
                                        <h1 className="text-3xl font-bold text-white mb-4">{result.title}</h1>
                                        {result.subtitle && (
                                            <p className="text-xl text-slate-400 mb-6 italic">{result.subtitle}</p>
                                        )}
                                        <div className="text-sm text-orange-400 font-mono mb-8">{result.metadata}</div>
                                        
                                        {/* Header Image */}
                                        {result.visuals.find(v => v.id === 'header')?.imageData && (
                                            <div className="mb-8 rounded-xl overflow-hidden">
                                                <img 
                                                    src={`data:image/png;base64,${result.visuals[0].imageData}`} 
                                                    alt="Header" 
                                                    className="w-full h-auto"
                                                />
                                            </div>
                                        )}
                                        
                                        {renderContentWithImages()}
                                    </div>
                                </div>
                            )}

                            {/* Edit Mode */}
                            {viewMode === 'edit' && (
                                <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full h-[600px] bg-slate-950/50 rounded-xl p-6 text-slate-200 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-orange-500/50 border border-white/5 resize-none"
                                    />
                                </div>
                            )}

                            {/* HTML Mode */}
                            {viewMode === 'html' && (
                                <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                                    <pre className="bg-slate-950 rounded-xl p-6 overflow-x-auto text-sm font-mono text-blue-300 leading-relaxed whitespace-pre-wrap">
                                        {generateHtmlCode()}
                                    </pre>
                                </div>
                            )}

                            {/* SEO Analysis */}
                            {viewMode === 'seo' && (
                                <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-6">
                                    <div className="text-center">
                                        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-${getScoreColor(seoScore.overall)}-500/20 border-4 border-${getScoreColor(seoScore.overall)}-500/30 mb-4`}>
                                            <span className={`text-3xl font-bold text-${getScoreColor(seoScore.overall)}-400`}>{seoScore.overall}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white">SEO Score</h3>
                                        <p className="text-slate-500 text-sm">Based on 6 key factors</p>
                                    </div>

                                    <div className="space-y-3">
                                        {[
                                            { label: 'Title Length', data: seoScore.titleLength },
                                            { label: 'Meta Description', data: seoScore.metaDescription },
                                            { label: 'Heading Structure', data: seoScore.headings },
                                            { label: 'Keyword Usage', data: seoScore.keywords },
                                            { label: 'Readability', data: seoScore.readability },
                                            { label: 'Images', data: seoScore.images },
                                        ].map(item => (
                                            <div key={item.label} className="p-4 rounded-xl bg-slate-950/50 border border-white/5">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-white">{item.label}</span>
                                                    <span className={`text-sm font-bold text-${getScoreColor(item.data.score)}-400`}>{item.data.score}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full bg-${getScoreColor(item.data.score)}-500 transition-all`}
                                                        style={{ width: `${item.data.score}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-500 mt-2">{item.data.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!result && !loading && (
                        <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
                                <Edit3 className="w-8 h-8 text-orange-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Ready to Create</h3>
                            <p className="text-slate-500 max-w-md">
                                Enter a URL, upload content, or describe a topic to generate a comprehensive blog post with AI-powered writing and SEO optimization.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BlogToBlog;
