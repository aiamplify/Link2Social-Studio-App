/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
    analyzeViralPost,
    generateMatchingHooks,
    convertViralPostToCarousel,
    convertViralPostToBlog,
    generatePostFromViralFormula,
    analyzeViralImage
} from '../services/geminiService';
import {
    ViralPostAnalysisResult,
    ViralFormulaJSON,
    PlatformRewrite
} from '../types';
import {
    Loader2, AlertCircle, Copy, Check, Download, Upload, Link, FileText, Image as ImageIcon,
    Sparkles, TrendingUp, Brain, Target, Zap, Heart, MessageSquare, Share2, Eye,
    ChevronDown, ChevronUp, RefreshCw, BookOpen, Layout, Layers, Save, ExternalLink,
    BarChart3, PieChart, Activity, Lightbulb, Award, Clock, Users, Hash, Globe,
    Play, Pause, ArrowRight, CheckCircle2, XCircle, Info, AlertTriangle, Star,
    Flame, Shield, Lock, Unlock, Maximize2, X, Send, Filter, Grid3X3
} from 'lucide-react';

// Platform icons and colors
const PLATFORMS = [
    { id: 'tiktok', name: 'TikTok', color: 'pink', icon: Play },
    { id: 'instagram', name: 'Instagram', color: 'purple', icon: ImageIcon },
    { id: 'x', name: 'X', color: 'slate', icon: MessageSquare },
    { id: 'linkedin', name: 'LinkedIn', color: 'blue', icon: Users },
    { id: 'facebook', name: 'Facebook', color: 'sky', icon: Globe },
    { id: 'youtube', name: 'YouTube', color: 'red', icon: Play },
];

// Score color helper
const getScoreColor = (score: number): string => {
    if (score >= 80) return 'emerald';
    if (score >= 60) return 'yellow';
    if (score >= 40) return 'orange';
    return 'red';
};

// Score bar component
const ScoreBar: React.FC<{ score: number; label: string; reason?: string }> = ({ score, label, reason }) => {
    const color = getScoreColor(score);
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{label}</span>
                <span className={`font-bold text-${color}-400`}>{score}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-400 transition-all duration-500`}
                    style={{ width: `${score}%` }}
                />
            </div>
            {reason && <p className="text-xs text-slate-500 mt-1">{reason}</p>}
        </div>
    );
};

// Expandable section component
const ExpandableSection: React.FC<{
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string | number;
    badgeColor?: string;
}> = ({ title, icon: Icon, children, defaultOpen = true, badge, badgeColor = 'violet' }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${badgeColor}-500/20`}>
                        <Icon className={`w-5 h-5 text-${badgeColor}-400`} />
                    </div>
                    <span className="font-semibold text-white">{title}</span>
                    {badge !== undefined && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-${badgeColor}-500/20 text-${badgeColor}-400`}>
                            {badge}
                        </span>
                    )}
                </div>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>
            {isOpen && <div className="p-4 pt-0 border-t border-white/5">{children}</div>}
        </div>
    );
};

// Platform rewrite card component
const PlatformRewriteCard: React.FC<{
    rewrite: PlatformRewrite;
    onCopy: () => void;
    copied: boolean;
}> = ({ rewrite, onCopy, copied }) => {
    const platform = PLATFORMS.find(p => p.name.toLowerCase() === rewrite.platform.toLowerCase() || p.id === rewrite.platform.toLowerCase());
    const color = platform?.color || 'slate';
    const Icon = platform?.icon || MessageSquare;

    return (
        <div className={`bg-slate-800/50 border border-${color}-500/20 rounded-xl p-4 space-y-3`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-${color}-500/20`}>
                        <Icon className={`w-4 h-4 text-${color}-400`} />
                    </div>
                    <span className="font-semibold text-white">{rewrite.platform}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{rewrite.characterCount} chars</span>
                    <button
                        onClick={onCopy}
                        className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${copied ? 'text-emerald-400' : 'text-slate-400'}`}
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{rewrite.content}</p>
            {rewrite.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {rewrite.hashtags.map((tag, i) => (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded-full bg-${color}-500/10 text-${color}-400`}>
                            #{tag.replace('#', '')}
                        </span>
                    ))}
                </div>
            )}
            <p className="text-xs text-slate-500 italic">{rewrite.optimizationNotes}</p>
        </div>
    );
};

const ViralPostAnalyzer: React.FC = () => {
    // Input state
    const [inputMode, setInputMode] = useState<'url' | 'text' | 'image'>('url');
    const [urlInput, setUrlInput] = useState('');
    const [textInput, setTextInput] = useState('');
    const [imageInput, setImageInput] = useState<string | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<string>('');

    // Analysis state
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ViralPostAnalysisResult | null>(null);

    // UI state
    const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
    const [copiedContent, setCopiedContent] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'analysis' | 'rewrites' | 'actions'>('analysis');
    const [generatingHooks, setGeneratingHooks] = useState(false);
    const [customHooks, setCustomHooks] = useState<string[]>([]);
    const [hookTopic, setHookTopic] = useState('');
    const [showFormulaModal, setShowFormulaModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

    // Image analysis state
    const [imageAnalysis, setImageAnalysis] = useState<{
        visualTriggers: string[];
        colorPsychology: string;
        compositionAnalysis: string;
        attentionFlow: string;
        recommendations: string[];
    } | null>(null);

    // Refs
    const imageInputRef = useRef<HTMLInputElement>(null);

    // Handle image upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = (event.target?.result as string).split(',')[1];
                setImageInput(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle analysis
    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        setImageAnalysis(null);

        try {
            let input: { type: 'url' | 'text' | 'image'; content: string; platform?: string };

            if (inputMode === 'url') {
                if (!urlInput.trim()) {
                    throw new Error('Please enter a valid URL');
                }
                input = { type: 'url', content: urlInput.trim() };
            } else if (inputMode === 'text') {
                if (!textInput.trim()) {
                    throw new Error('Please enter post content');
                }
                input = { type: 'text', content: textInput.trim(), platform: selectedPlatform };
            } else {
                if (!imageInput) {
                    throw new Error('Please upload an image');
                }
                input = { type: 'image', content: imageInput, platform: selectedPlatform };

                // Also analyze the image
                setLoadingStage('ANALYZING VISUAL ELEMENTS...');
                const imgAnalysis = await analyzeViralImage(imageInput);
                setImageAnalysis(imgAnalysis);
            }

            const analysisResult = await analyzeViralPost(input, setLoadingStage);
            setResult(analysisResult);
            setActiveTab('analysis');
        } catch (e: any) {
            setError(e.message || 'Analysis failed');
        } finally {
            setLoading(false);
            setLoadingStage('');
        }
    };

    // Handle copy to clipboard
    const handleCopy = async (content: string, id: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedContent(id);
        setTimeout(() => setCopiedContent(null), 2000);
    };

    // Handle generate matching hooks
    const handleGenerateHooks = async () => {
        if (!result || !hookTopic.trim()) return;

        setGeneratingHooks(true);
        try {
            const hooks = await generateMatchingHooks(result.viralFormula, hookTopic, 10);
            setCustomHooks(hooks);
        } catch (e) {
            console.error('Hook generation failed:', e);
        } finally {
            setGeneratingHooks(false);
        }
    };

    // Export functions
    const exportJSON = () => {
        if (!result) return;
        const blob = new Blob([JSON.stringify(result.viralFormula, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'viral-formula.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportPlainText = () => {
        if (!result) return;
        const text = `
VIRAL POST ANALYSIS REPORT
===========================

ORIGINAL CONTENT:
${result.originalContent}

PLATFORM: ${result.platform}

---

VIRAL STRUCTURE BREAKDOWN
-------------------------
Hook Category: ${result.structure.hookCategory}
Hook Text: ${result.structure.hookText}
Sentence Rhythm: ${result.structure.sentenceRhythm}
Line Break Strategy: ${result.structure.lineBreakStrategy}
Emoji Psychology: ${result.structure.emojiPsychology || 'None'}
Pacing: ${result.structure.pacingType}
Content Length: ${result.structure.contentLengthClass}

---

PSYCHOLOGICAL TRIGGER MAP
-------------------------
Primary Emotion: ${result.psychology.primaryEmotion}
Secondary Emotion: ${result.psychology.secondaryEmotion}
Pattern Interrupt: ${result.psychology.patternInterrupt}
Social Validation: ${result.psychology.socialValidation}
Urgency Signal: ${result.psychology.urgencySignal || 'None'}
Identity Appeal: ${result.psychology.identityAppeal}

---

ALGORITHM FRIENDLINESS SCORE: ${result.algorithmScore.overall}/100
CONVERSION READINESS SCORE: ${result.conversionScore.overall}/100

---

CONTENT DNA SUMMARY
-------------------
Why It Went Viral:
${result.contentDNA.whyItWentViral}

Common Mistakes When Copying:
${result.contentDNA.commonMistakesCopying}

How to Ethically Replicate:
${result.contentDNA.ethicalReplicationGuide}

---

VIRAL FORMULA
-------------
Hook Formula: ${result.viralFormula.hookFormula}
Structure Pattern: ${result.viralFormula.structurePattern}
Emotional Sequence: ${result.viralFormula.emotionalSequence.join(' → ')}
CTA Template: ${result.viralFormula.ctaTemplate}
        `.trim();

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'viral-analysis-report.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500">
                            <TrendingUp className="w-7 h-7 text-white" />
                        </div>
                        AI Viral Post Analyzer
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Reverse-engineer viral content to understand the psychology, structure, and algorithm optimization
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-500/10 border border-pink-500/20 rounded-full">
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    <span className="text-xs font-mono text-pink-400">VIRAL GROWTH CONSULTANT</span>
                </div>
            </div>

            {/* Input Section */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                {/* Input Mode Tabs */}
                <div className="flex gap-2">
                    {[
                        { id: 'url', label: 'Social Post URL', icon: Link },
                        { id: 'text', label: 'Raw Caption/Text', icon: FileText },
                        { id: 'image', label: 'Image Upload', icon: ImageIcon },
                    ].map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => setInputMode(mode.id as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                                inputMode === mode.id
                                    ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/25'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <mode.icon className="w-4 h-4" />
                            {mode.label}
                        </button>
                    ))}
                </div>

                {/* Input Fields */}
                {inputMode === 'url' && (
                    <div className="space-y-3">
                        <label className="text-sm text-slate-400">
                            Paste a viral post URL (TikTok, Instagram, X, Facebook, LinkedIn, YouTube)
                        </label>
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://twitter.com/user/status/..."
                            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50 transition-colors"
                        />
                    </div>
                )}

                {inputMode === 'text' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-slate-400">Paste the viral post content</label>
                            <select
                                value={selectedPlatform}
                                onChange={(e) => setSelectedPlatform(e.target.value)}
                                className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
                            >
                                <option value="">Select Platform</option>
                                {PLATFORMS.map((p) => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Paste the viral post caption or text here..."
                            rows={6}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50 transition-colors resize-none"
                        />
                    </div>
                )}

                {inputMode === 'image' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-slate-400">Upload a viral post image/screenshot</label>
                            <select
                                value={selectedPlatform}
                                onChange={(e) => setSelectedPlatform(e.target.value)}
                                className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
                            >
                                <option value="">Select Platform</option>
                                {PLATFORMS.map((p) => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div
                            onClick={() => imageInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                                imageInput
                                    ? 'border-pink-500/50 bg-pink-500/5'
                                    : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                            }`}
                        >
                            {imageInput ? (
                                <div className="space-y-3">
                                    <img
                                        src={`data:image/png;base64,${imageInput}`}
                                        alt="Uploaded"
                                        className="max-h-48 mx-auto rounded-lg"
                                    />
                                    <p className="text-sm text-pink-400">Image uploaded. Click to change.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Upload className="w-12 h-12 mx-auto text-slate-500" />
                                    <p className="text-slate-400">Click to upload or drag and drop</p>
                                    <p className="text-xs text-slate-500">PNG, JPG up to 10MB</p>
                                </div>
                            )}
                        </div>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>
                )}

                {/* Analyze Button */}
                <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>{loadingStage || 'Analyzing...'}</span>
                        </>
                    ) : (
                        <>
                            <Brain className="w-5 h-5" />
                            <span>Analyze Viral Mechanics</span>
                        </>
                    )}
                </button>

                {/* Error Display */}
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-red-400">{error}</p>
                    </div>
                )}
            </div>

            {/* Results Section */}
            {result && (
                <div className="space-y-6">
                    {/* Tab Navigation */}
                    <div className="flex gap-2 border-b border-white/5 pb-4">
                        {[
                            { id: 'analysis', label: 'Deep Analysis', icon: Brain },
                            { id: 'rewrites', label: 'Platform Rewrites', icon: RefreshCw },
                            { id: 'actions', label: 'Actions & Export', icon: Zap },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-white/10 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Analysis Tab */}
                    {activeTab === 'analysis' && (
                        <div className="grid lg:grid-cols-2 gap-6">
                            {/* Left Column */}
                            <div className="space-y-6">
                                {/* Original Content */}
                                <ExpandableSection title="Original Content" icon={FileText} badgeColor="slate" badge={result.platform}>
                                    <div className="bg-slate-800/50 rounded-lg p-4">
                                        <p className="text-slate-300 whitespace-pre-wrap text-sm">{result.originalContent}</p>
                                    </div>
                                </ExpandableSection>

                                {/* Viral Structure Breakdown */}
                                <ExpandableSection title="Viral Structure Breakdown" icon={Layers} badgeColor="pink">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Hook Category</p>
                                                <p className="text-pink-400 font-bold">{result.structure.hookCategory}</p>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Pacing Type</p>
                                                <p className="text-pink-400 font-bold">{result.structure.pacingType}</p>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Content Length</p>
                                                <p className="text-pink-400 font-bold">{result.structure.contentLengthClass}</p>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Audience Intent</p>
                                                <p className="text-pink-400 font-bold">{result.audienceIntent}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 mb-1">Hook Text</p>
                                            <p className="text-white font-medium">&ldquo;{result.structure.hookText}&rdquo;</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 mb-1">Sentence Rhythm</p>
                                            <p className="text-slate-300 text-sm">{result.structure.sentenceRhythm}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 mb-1">Line Break Strategy</p>
                                            <p className="text-slate-300 text-sm">{result.structure.lineBreakStrategy}</p>
                                        </div>
                                        {result.structure.emojiPsychology && (
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Emoji Psychology</p>
                                                <p className="text-slate-300 text-sm">{result.structure.emojiPsychology}</p>
                                            </div>
                                        )}
                                    </div>
                                </ExpandableSection>

                                {/* Psychological Trigger Map */}
                                <ExpandableSection title="Psychological Trigger Map" icon={Heart} badgeColor="red">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Primary Emotion</p>
                                                <p className="text-red-400 font-bold">{result.psychology.primaryEmotion}</p>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Secondary Emotion</p>
                                                <p className="text-red-400 font-bold">{result.psychology.secondaryEmotion}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 mb-1">Pattern Interrupt</p>
                                            <p className="text-slate-300 text-sm">{result.psychology.patternInterrupt}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 mb-1">Social Validation Signal</p>
                                            <p className="text-slate-300 text-sm">{result.psychology.socialValidation}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 mb-1">Identity Appeal</p>
                                            <p className="text-slate-300 text-sm">{result.psychology.identityAppeal}</p>
                                        </div>
                                        {result.psychology.urgencySignal && (
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Urgency Signal</p>
                                                <p className="text-orange-400 text-sm">{result.psychology.urgencySignal}</p>
                                            </div>
                                        )}
                                        {result.psychology.scarcityTactic && (
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Scarcity Tactic</p>
                                                <p className="text-orange-400 text-sm">{result.psychology.scarcityTactic}</p>
                                            </div>
                                        )}
                                    </div>
                                </ExpandableSection>

                                {/* Image Analysis (if available) */}
                                {imageAnalysis && (
                                    <ExpandableSection title="Visual Trigger Analysis" icon={Eye} badgeColor="cyan">
                                        <div className="space-y-4">
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-2">Visual Triggers</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {imageAnalysis.visualTriggers.map((trigger, i) => (
                                                        <span key={i} className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded-full">
                                                            {trigger}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Color Psychology</p>
                                                <p className="text-slate-300 text-sm">{imageAnalysis.colorPsychology}</p>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Composition</p>
                                                <p className="text-slate-300 text-sm">{imageAnalysis.compositionAnalysis}</p>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Attention Flow</p>
                                                <p className="text-slate-300 text-sm">{imageAnalysis.attentionFlow}</p>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-2">Recommendations</p>
                                                <ul className="space-y-1">
                                                    {imageAnalysis.recommendations.map((rec, i) => (
                                                        <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                                            {rec}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </ExpandableSection>
                                )}
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                {/* Algorithm Score */}
                                <ExpandableSection
                                    title="Algorithm Friendliness Score"
                                    icon={BarChart3}
                                    badgeColor="emerald"
                                    badge={result.algorithmScore.overall}
                                >
                                    <div className="space-y-4">
                                        {/* Overall Score */}
                                        <div className="flex items-center justify-center p-6 bg-slate-800/50 rounded-xl">
                                            <div className="text-center">
                                                <div className={`text-5xl font-bold text-${getScoreColor(result.algorithmScore.overall)}-400`}>
                                                    {result.algorithmScore.overall}
                                                </div>
                                                <p className="text-slate-400 text-sm mt-1">out of 100</p>
                                            </div>
                                        </div>
                                        {/* Individual Scores */}
                                        <div className="space-y-3">
                                            <ScoreBar
                                                score={result.algorithmScore.engagementBaiting.score}
                                                label="Engagement Baiting"
                                                reason={result.algorithmScore.engagementBaiting.reason}
                                            />
                                            <ScoreBar
                                                score={result.algorithmScore.retentionTriggers.score}
                                                label="Retention Triggers"
                                                reason={result.algorithmScore.retentionTriggers.reason}
                                            />
                                            <ScoreBar
                                                score={result.algorithmScore.rewatchFactor.score}
                                                label="Rewatch Factor"
                                                reason={result.algorithmScore.rewatchFactor.reason}
                                            />
                                            <ScoreBar
                                                score={result.algorithmScore.commentActivation.score}
                                                label="Comment Activation"
                                                reason={result.algorithmScore.commentActivation.reason}
                                            />
                                            <ScoreBar
                                                score={result.algorithmScore.shareMotivation.score}
                                                label="Share Motivation"
                                                reason={result.algorithmScore.shareMotivation.reason}
                                            />
                                        </div>
                                    </div>
                                </ExpandableSection>

                                {/* Conversion Score */}
                                <ExpandableSection
                                    title="Conversion Readiness Score"
                                    icon={Target}
                                    badgeColor="violet"
                                    badge={result.conversionScore.overall}
                                >
                                    <div className="space-y-4">
                                        {/* Overall Score */}
                                        <div className="flex items-center justify-center p-6 bg-slate-800/50 rounded-xl">
                                            <div className="text-center">
                                                <div className={`text-5xl font-bold text-${getScoreColor(result.conversionScore.overall)}-400`}>
                                                    {result.conversionScore.overall}
                                                </div>
                                                <p className="text-slate-400 text-sm mt-1">out of 100</p>
                                            </div>
                                        </div>
                                        {/* Individual Scores */}
                                        <div className="space-y-3">
                                            <ScoreBar
                                                score={result.conversionScore.ctaClarity.score}
                                                label="CTA Clarity"
                                                reason={result.conversionScore.ctaClarity.reason}
                                            />
                                            <ScoreBar
                                                score={result.conversionScore.trustIndicators.score}
                                                label="Trust Indicators"
                                                reason={result.conversionScore.trustIndicators.reason}
                                            />
                                            <ScoreBar
                                                score={result.conversionScore.offerPositioning.score}
                                                label="Offer Positioning"
                                                reason={result.conversionScore.offerPositioning.reason}
                                            />
                                            <ScoreBar
                                                score={result.conversionScore.curiosityGap.score}
                                                label="Curiosity Gap"
                                                reason={result.conversionScore.curiosityGap.reason}
                                            />
                                        </div>
                                    </div>
                                </ExpandableSection>

                                {/* Content DNA Summary */}
                                <ExpandableSection title="Content DNA Summary" icon={Lightbulb} badgeColor="amber">
                                    <div className="space-y-4">
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                <p className="text-sm font-semibold text-emerald-400">Why It Went Viral</p>
                                            </div>
                                            <p className="text-slate-300 text-sm">{result.contentDNA.whyItWentViral}</p>
                                        </div>
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                                <p className="text-sm font-semibold text-red-400">What Most People Do Wrong</p>
                                            </div>
                                            <p className="text-slate-300 text-sm">{result.contentDNA.commonMistakesCopying}</p>
                                        </div>
                                        <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Star className="w-4 h-4 text-violet-400" />
                                                <p className="text-sm font-semibold text-violet-400">How to Ethically Replicate</p>
                                            </div>
                                            <p className="text-slate-300 text-sm">{result.contentDNA.ethicalReplicationGuide}</p>
                                        </div>
                                    </div>
                                </ExpandableSection>

                                {/* Viral Formula */}
                                <ExpandableSection title="Viral Formula (Copyable)" icon={Flame} badgeColor="orange">
                                    <div className="space-y-4">
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 mb-1">Hook Formula</p>
                                            <p className="text-orange-400 font-mono text-sm">{result.viralFormula.hookFormula}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 mb-1">Structure Pattern</p>
                                            <p className="text-slate-300 text-sm">{result.viralFormula.structurePattern}</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 mb-2">Emotional Sequence</p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {result.viralFormula.emotionalSequence.map((emotion, i) => (
                                                    <React.Fragment key={i}>
                                                        <span className="px-2 py-1 bg-orange-500/10 text-orange-400 text-xs rounded-full">
                                                            {emotion}
                                                        </span>
                                                        {i < result.viralFormula.emotionalSequence.length - 1 && (
                                                            <ArrowRight className="w-4 h-4 text-slate-500" />
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 mb-1">CTA Template</p>
                                            <p className="text-slate-300 text-sm">{result.viralFormula.ctaTemplate}</p>
                                        </div>
                                    </div>
                                </ExpandableSection>

                                {/* Matching Hooks */}
                                <ExpandableSection title="Alternative Hooks (Same Formula)" icon={Hash} badgeColor="cyan" badge={result.matchingHooks.length}>
                                    <div className="space-y-2">
                                        {result.matchingHooks.map((hook, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg group hover:bg-slate-800 transition-colors"
                                            >
                                                <span className="text-cyan-400 font-mono text-sm">{i + 1}.</span>
                                                <p className="text-slate-300 text-sm flex-1">{hook}</p>
                                                <button
                                                    onClick={() => handleCopy(hook, `hook-${i}`)}
                                                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                                        copiedContent === `hook-${i}` ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                                                    }`}
                                                >
                                                    {copiedContent === `hook-${i}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </ExpandableSection>
                            </div>
                        </div>
                    )}

                    {/* Rewrites Tab */}
                    {activeTab === 'rewrites' && (
                        <div className="space-y-6">
                            {/* Platform Rewrites */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-violet-400" />
                                    Platform-Optimized Rewrites
                                </h3>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {result.platformRewrites.map((rewrite, i) => (
                                        <PlatformRewriteCard
                                            key={i}
                                            rewrite={rewrite}
                                            onCopy={() => handleCopy(rewrite.content, `platform-${i}`)}
                                            copied={copiedContent === `platform-${i}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Brand-Friendly Versions */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-emerald-400" />
                                    Brand-Friendly Versions
                                </h3>
                                <div className="space-y-3">
                                    {result.brandFriendlyVersions.map((version, i) => (
                                        <div
                                            key={i}
                                            className="flex items-start gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl group"
                                        >
                                            <span className="text-emerald-400 font-mono text-sm">{i + 1}.</span>
                                            <p className="text-slate-300 text-sm flex-1">{version}</p>
                                            <button
                                                onClick={() => handleCopy(version, `brand-${i}`)}
                                                className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                                    copiedContent === `brand-${i}` ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                {copiedContent === `brand-${i}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Aggressive Versions */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-orange-400" />
                                    High-CTR Aggressive Versions
                                </h3>
                                <div className="space-y-3">
                                    {result.aggressiveVersions.map((version, i) => (
                                        <div
                                            key={i}
                                            className="flex items-start gap-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl group"
                                        >
                                            <span className="text-orange-400 font-mono text-sm">{i + 1}.</span>
                                            <p className="text-slate-300 text-sm flex-1">{version}</p>
                                            <button
                                                onClick={() => handleCopy(version, `aggressive-${i}`)}
                                                className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                                    copiedContent === `aggressive-${i}` ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                {copiedContent === `aggressive-${i}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions Tab */}
                    {activeTab === 'actions' && (
                        <div className="space-y-6">
                            {/* Action Buttons */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <button
                                    onClick={() => setShowFormulaModal(true)}
                                    className="flex flex-col items-center gap-3 p-6 bg-slate-900/50 border border-white/5 rounded-xl hover:bg-white/5 hover:border-violet-500/30 transition-all group"
                                >
                                    <div className="p-3 rounded-xl bg-violet-500/20 group-hover:bg-violet-500 transition-colors">
                                        <Sparkles className="w-6 h-6 text-violet-400 group-hover:text-white" />
                                    </div>
                                    <span className="font-semibold text-white">Turn Into My Own Post</span>
                                    <span className="text-xs text-slate-500 text-center">Generate a new post using this formula</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setHookTopic(result.structure.hookText.split(' ').slice(0, 3).join(' '));
                                        handleGenerateHooks();
                                    }}
                                    disabled={generatingHooks}
                                    className="flex flex-col items-center gap-3 p-6 bg-slate-900/50 border border-white/5 rounded-xl hover:bg-white/5 hover:border-pink-500/30 transition-all group disabled:opacity-50"
                                >
                                    <div className="p-3 rounded-xl bg-pink-500/20 group-hover:bg-pink-500 transition-colors">
                                        {generatingHooks ? (
                                            <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
                                        ) : (
                                            <Hash className="w-6 h-6 text-pink-400 group-hover:text-white" />
                                        )}
                                    </div>
                                    <span className="font-semibold text-white">Generate Matching Hooks</span>
                                    <span className="text-xs text-slate-500 text-center">Create 10 more hooks using this formula</span>
                                </button>

                                <button
                                    className="flex flex-col items-center gap-3 p-6 bg-slate-900/50 border border-white/5 rounded-xl hover:bg-white/5 hover:border-sky-500/30 transition-all group"
                                >
                                    <div className="p-3 rounded-xl bg-sky-500/20 group-hover:bg-sky-500 transition-colors">
                                        <Layout className="w-6 h-6 text-sky-400 group-hover:text-white" />
                                    </div>
                                    <span className="font-semibold text-white">Turn Into Carousel</span>
                                    <span className="text-xs text-slate-500 text-center">Convert to multi-slide format</span>
                                </button>

                                <button
                                    className="flex flex-col items-center gap-3 p-6 bg-slate-900/50 border border-white/5 rounded-xl hover:bg-white/5 hover:border-emerald-500/30 transition-all group"
                                >
                                    <div className="p-3 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors">
                                        <BookOpen className="w-6 h-6 text-emerald-400 group-hover:text-white" />
                                    </div>
                                    <span className="font-semibold text-white">Turn Into Blog</span>
                                    <span className="text-xs text-slate-500 text-center">Expand into full blog article</span>
                                </button>
                            </div>

                            {/* Generated Hooks Display */}
                            {customHooks.length > 0 && (
                                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <Hash className="w-5 h-5 text-pink-400" />
                                        Generated Matching Hooks
                                    </h3>
                                    <div className="space-y-2">
                                        {customHooks.map((hook, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg group hover:bg-slate-800 transition-colors"
                                            >
                                                <span className="text-pink-400 font-mono text-sm">{i + 1}.</span>
                                                <p className="text-slate-300 text-sm flex-1">{hook}</p>
                                                <button
                                                    onClick={() => handleCopy(hook, `custom-hook-${i}`)}
                                                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                                        copiedContent === `custom-hook-${i}` ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                                                    }`}
                                                >
                                                    {copiedContent === `custom-hook-${i}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Export Section */}
                            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Download className="w-5 h-5 text-violet-400" />
                                    Export Analysis
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={exportJSON}
                                        className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg text-violet-400 hover:bg-violet-500/20 transition-colors"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Export JSON Formula
                                    </button>
                                    <button
                                        onClick={exportPlainText}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Export Plain Text Report
                                    </button>
                                    <button
                                        onClick={() => {
                                            const allRewrites = result.platformRewrites.map(r => `[${r.platform}]\n${r.content}\n\n#${r.hashtags.join(' #')}`).join('\n\n---\n\n');
                                            handleCopy(allRewrites, 'all-rewrites');
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-lg transition-colors ${
                                            copiedContent === 'all-rewrites' ? 'text-emerald-400' : 'text-pink-400 hover:bg-pink-500/20'
                                        }`}
                                    >
                                        {copiedContent === 'all-rewrites' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        Copy All Rewrites
                                    </button>
                                </div>
                            </div>

                            {/* Safety Notice */}
                            <div className="flex items-start gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                <Shield className="w-6 h-6 text-amber-400 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-amber-400 mb-1">Safety & Compliance Notice</h4>
                                    <p className="text-sm text-slate-400">
                                        This tool analyzes psychological mechanics and structure only. It does not plagiarize content.
                                        All generated rewrites are original and based on the extracted formula, not copied text.
                                        Use responsibly and ethically to create value-driven content.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Formula Generation Modal */}
            {showFormulaModal && result && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFormulaModal(false)} />
                    <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Generate Your Own Post</h3>
                            <button
                                onClick={() => setShowFormulaModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">Your Topic</label>
                                <input
                                    type="text"
                                    placeholder="Enter your topic or niche..."
                                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">Target Platform</label>
                                <select className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none">
                                    {PLATFORMS.map((p) => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">Tone</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['brand-friendly', 'balanced', 'aggressive'].map((tone) => (
                                        <button
                                            key={tone}
                                            className="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-slate-400 hover:border-violet-500/50 hover:text-violet-400 transition-colors capitalize"
                                        >
                                            {tone.replace('-', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 text-white font-bold rounded-xl transition-all"
                            >
                                <Sparkles className="w-5 h-5" />
                                Generate Post
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViralPostAnalyzer;
