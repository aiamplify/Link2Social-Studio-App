/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { 
    FileText, Loader2, AlertCircle, Download, Copy, Check, Image as ImageIcon, Sparkles, 
    RefreshCw, Wand2, X, Upload, Palette, Type, Layout, Eye, EyeOff, Maximize, Minimize,
    ChevronDown, ChevronUp, Settings, Sliders, Target, TrendingUp, BarChart3, Users, Hash,
    Zap, Award, Star, Heart, MousePointer, Lightbulb, CheckCircle2, XCircle, Info, HelpCircle,
    Grid3X3, Layers, PanelLeft, ArrowRight, ArrowLeft, Plus, Trash2, Save, FolderOpen,
    Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2, Minimize2, Share2,
    Clock, Calendar, Bookmark, MoreHorizontal, Filter, Search, Edit3, Move, RotateCcw,
    Video, Camera, Aperture, Clapperboard, Scissors, Music, FileVideo, MonitorPlay,
    GripVertical, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Lock, Unlock, Link,
    Shuffle, Clipboard, Timer, Rewind, FastForward, List, ListOrdered, AlignLeft,
    Film, Mic, MessageSquare, BookOpen, PenTool, Printer, FileDown, Table
} from 'lucide-react';
import ImageViewer from './ImageViewer';

// Script formats
const SCRIPT_FORMATS = [
    { id: 'screenplay', name: 'Screenplay', description: 'Standard film/TV format' },
    { id: 'youtube', name: 'YouTube Script', description: 'Optimized for video content' },
    { id: 'commercial', name: 'Commercial', description: '30-60 second ad format' },
    { id: 'documentary', name: 'Documentary', description: 'Narration-focused format' },
    { id: 'podcast', name: 'Podcast', description: 'Audio-first format' },
    { id: 'social', name: 'Social Media', description: 'Short-form content' },
];

// Visual styles for storyboard
const VISUAL_STYLES = [
    { id: 'sketch', name: 'Sketch', description: 'Hand-drawn style', colors: ['#2d3436', '#636e72', '#dfe6e9'] },
    { id: 'cinematic', name: 'Cinematic', description: 'Film-like quality', colors: ['#1a1a2e', '#16213e', '#e94560'] },
    { id: 'minimal', name: 'Minimal', description: 'Clean and simple', colors: ['#ffffff', '#f5f5f5', '#333333'] },
    { id: 'comic', name: 'Comic Book', description: 'Bold and dynamic', colors: ['#ff6b6b', '#feca57', '#48dbfb'] },
    { id: 'realistic', name: 'Realistic', description: 'Photo-like renders', colors: ['#2c3e50', '#3498db', '#ecf0f1'] },
    { id: 'custom', name: 'Custom', description: 'Define your own', colors: ['#888888', '#888888', '#888888'] },
];

// Shot types
const SHOT_TYPES = [
    { id: 'wide', name: 'Wide Shot (WS)', description: 'Full scene view' },
    { id: 'medium', name: 'Medium Shot (MS)', description: 'Waist up' },
    { id: 'closeup', name: 'Close-Up (CU)', description: 'Face or detail' },
    { id: 'extreme_closeup', name: 'Extreme Close-Up (ECU)', description: 'Very tight detail' },
    { id: 'over_shoulder', name: 'Over the Shoulder (OTS)', description: 'Behind character' },
    { id: 'pov', name: 'Point of View (POV)', description: 'Character perspective' },
    { id: 'aerial', name: 'Aerial/Drone', description: 'Bird\'s eye view' },
    { id: 'tracking', name: 'Tracking Shot', description: 'Following movement' },
];

// Camera movements
const CAMERA_MOVEMENTS = [
    { id: 'static', name: 'Static', description: 'No movement' },
    { id: 'pan', name: 'Pan', description: 'Horizontal rotation' },
    { id: 'tilt', name: 'Tilt', description: 'Vertical rotation' },
    { id: 'dolly', name: 'Dolly', description: 'Forward/backward' },
    { id: 'truck', name: 'Truck', description: 'Side to side' },
    { id: 'zoom', name: 'Zoom', description: 'Lens zoom' },
    { id: 'crane', name: 'Crane', description: 'Vertical movement' },
    { id: 'handheld', name: 'Handheld', description: 'Natural shake' },
];

// Scene interface
interface ScriptScene {
    id: string;
    sceneNumber: number;
    heading: string;
    action: string;
    dialogue: { character: string; line: string }[];
    duration: number;
    shotType: string;
    cameraMovement: string;
    notes: string;
    imageData: string | null;
    isGenerating: boolean;
    audioNotes: string;
    props: string[];
    location: string;
    timeOfDay: string;
}

// Shot list item
interface ShotListItem {
    id: string;
    sceneNumber: number;
    shotNumber: number;
    shotType: string;
    cameraMovement: string;
    description: string;
    duration: number;
    equipment: string;
    notes: string;
}

// Project interface
interface ScriptProject {
    id: string;
    name: string;
    format: string;
    scenes: ScriptScene[];
    shotList: ShotListItem[];
    createdAt: Date;
    updatedAt: Date;
}

interface ScriptVisualizerProps {
    apiKey?: string;
}

const ScriptVisualizer: React.FC<ScriptVisualizerProps> = ({ apiKey }) => {
    // Project state
    const [projectName, setProjectName] = useState('Untitled Script');
    const [scriptFormat, setScriptFormat] = useState(SCRIPT_FORMATS[0]);
    const [scenes, setScenes] = useState<ScriptScene[]>([]);
    const [shotList, setShotList] = useState<ShotListItem[]>([]);
    const [selectedScene, setSelectedScene] = useState<string | null>(null);
    
    // Input state
    const [scriptInput, setScriptInput] = useState('');
    const [inputMode, setInputMode] = useState<'paste' | 'upload' | 'generate'>('paste');
    const [generatePrompt, setGeneratePrompt] = useState('');
    
    // Configuration
    const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0]);
    const [customStyle, setCustomStyle] = useState('');
    const [generateImages, setGenerateImages] = useState(true);
    const [includeAudioNotes, setIncludeAudioNotes] = useState(true);
    const [includeShotList, setIncludeShotList] = useState(true);
    
    // Advanced options
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [framesPerScene, setFramesPerScene] = useState(1);
    const [includeTimecodes, setIncludeTimecodes] = useState(true);
    
    // Generation state
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    // UI state
    const [viewMode, setViewMode] = useState<'storyboard' | 'script' | 'shotlist' | 'split'>('storyboard');
    const [fullScreenImage, setFullScreenImage] = useState<{src: string, alt: string} | null>(null);
    const [showExportPanel, setShowExportPanel] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(100);
    
    // Saved projects
    const [savedProjects, setSavedProjects] = useState<ScriptProject[]>([]);
    const [showProjectsPanel, setShowProjectsPanel] = useState(false);
    
    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Parse script into scenes
    const parseScript = (script: string): ScriptScene[] => {
        const lines = script.split('\n');
        const parsedScenes: ScriptScene[] = [];
        let currentScene: Partial<ScriptScene> | null = null;
        let sceneNumber = 0;

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Scene heading (INT./EXT.)
            if (trimmedLine.match(/^(INT\.|EXT\.|INT\/EXT\.)/i)) {
                if (currentScene) {
                    parsedScenes.push(currentScene as ScriptScene);
                }
                sceneNumber++;
                currentScene = {
                    id: `scene_${Date.now()}_${sceneNumber}`,
                    sceneNumber,
                    heading: trimmedLine,
                    action: '',
                    dialogue: [],
                    duration: 30,
                    shotType: 'wide',
                    cameraMovement: 'static',
                    notes: '',
                    imageData: null,
                    isGenerating: false,
                    audioNotes: '',
                    props: [],
                    location: trimmedLine.replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, '').split('-')[0].trim(),
                    timeOfDay: trimmedLine.includes('-') ? trimmedLine.split('-').pop()?.trim() || 'DAY' : 'DAY',
                };
            } else if (currentScene) {
                // Check for character name (all caps)
                if (trimmedLine.match(/^[A-Z][A-Z\s]+$/) && trimmedLine.length < 30) {
                    // Next line should be dialogue
                    const characterName = trimmedLine;
                    // This is simplified - in real implementation, we'd look ahead
                    currentScene.dialogue = currentScene.dialogue || [];
                } else if (trimmedLine && !trimmedLine.startsWith('(')) {
                    // Action line
                    currentScene.action = (currentScene.action || '') + ' ' + trimmedLine;
                }
            }
        }

        if (currentScene) {
            parsedScenes.push(currentScene as ScriptScene);
        }

        return parsedScenes.length > 0 ? parsedScenes : [{
            id: `scene_${Date.now()}_1`,
            sceneNumber: 1,
            heading: 'INT. LOCATION - DAY',
            action: script.substring(0, 500),
            dialogue: [],
            duration: 30,
            shotType: 'wide',
            cameraMovement: 'static',
            notes: '',
            imageData: null,
            isGenerating: false,
            audioNotes: '',
            props: [],
            location: 'Location',
            timeOfDay: 'DAY',
        }];
    };

    // Generate storyboard from script
    const generateStoryboard = async () => {
        if (inputMode === 'paste' && !scriptInput.trim()) {
            setError("Please enter or paste your script");
            return;
        }
        if (inputMode === 'generate' && !generatePrompt.trim()) {
            setError("Please describe what you want to generate");
            return;
        }

        setLoading(true);
        setError(null);
        setLoadingStage('Parsing script...');

        try {
            let parsedScenes: ScriptScene[];

            if (inputMode === 'generate') {
                // Generate script from prompt
                setLoadingStage('Generating script...');
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Create sample scenes based on prompt
                parsedScenes = Array.from({ length: 5 }, (_, i) => ({
                    id: `scene_${Date.now()}_${i + 1}`,
                    sceneNumber: i + 1,
                    heading: `INT. SCENE ${i + 1} - DAY`,
                    action: `Scene ${i + 1} action based on: ${generatePrompt}`,
                    dialogue: [],
                    duration: 30,
                    shotType: SHOT_TYPES[i % SHOT_TYPES.length].id,
                    cameraMovement: CAMERA_MOVEMENTS[i % CAMERA_MOVEMENTS.length].id,
                    notes: '',
                    imageData: null,
                    isGenerating: true,
                    audioNotes: '',
                    props: [],
                    location: `Location ${i + 1}`,
                    timeOfDay: 'DAY',
                }));
            } else {
                parsedScenes = parseScript(scriptInput);
                parsedScenes = parsedScenes.map(scene => ({ ...scene, isGenerating: generateImages }));
            }

            setScenes(parsedScenes);

            // Generate shot list
            if (includeShotList) {
                setLoadingStage('Creating shot list...');
                const newShotList: ShotListItem[] = parsedScenes.flatMap((scene, sceneIdx) => 
                    Array.from({ length: framesPerScene }, (_, shotIdx) => ({
                        id: `shot_${scene.id}_${shotIdx + 1}`,
                        sceneNumber: scene.sceneNumber,
                        shotNumber: shotIdx + 1,
                        shotType: scene.shotType,
                        cameraMovement: scene.cameraMovement,
                        description: `Shot ${shotIdx + 1} of Scene ${scene.sceneNumber}`,
                        duration: Math.floor(scene.duration / framesPerScene),
                        equipment: 'Standard',
                        notes: '',
                    }))
                );
                setShotList(newShotList);
            }

            // Generate images for each scene
            if (generateImages) {
                for (let i = 0; i < parsedScenes.length; i++) {
                    setLoadingStage(`Generating storyboard frame ${i + 1} of ${parsedScenes.length}...`);
                    
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    // Create placeholder image
                    const canvas = document.createElement('canvas');
                    canvas.width = aspectRatio === '16:9' ? 1280 : aspectRatio === '9:16' ? 720 : 1080;
                    canvas.height = aspectRatio === '16:9' ? 720 : aspectRatio === '9:16' ? 1280 : 1080;
                    const ctx = canvas.getContext('2d');
                    
                    if (ctx) {
                        // Create gradient background
                        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                        selectedStyle.colors.forEach((color, idx) => {
                            gradient.addColorStop(idx / (selectedStyle.colors.length - 1), color);
                        });
                        ctx.fillStyle = gradient;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Add scene info
                        ctx.font = 'bold 36px Arial';
                        ctx.fillStyle = 'rgba(255,255,255,0.9)';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(`Scene ${parsedScenes[i].sceneNumber}`, canvas.width / 2, canvas.height / 2 - 40);
                        
                        ctx.font = '24px Arial';
                        ctx.fillStyle = 'rgba(255,255,255,0.7)';
                        ctx.fillText(parsedScenes[i].heading.substring(0, 40), canvas.width / 2, canvas.height / 2 + 10);
                        
                        // Add shot type
                        ctx.font = '18px Arial';
                        ctx.fillStyle = 'rgba(255,255,255,0.5)';
                        ctx.fillText(SHOT_TYPES.find(s => s.id === parsedScenes[i].shotType)?.name || '', canvas.width / 2, canvas.height / 2 + 50);
                    }
                    
                    const imageData = canvas.toDataURL('image/png').split(',')[1];
                    
                    setScenes(prev => prev.map(s => 
                        s.id === parsedScenes[i].id 
                            ? { ...s, imageData, isGenerating: false }
                            : s
                    ));
                }
            }

            setLoadingStage('');
            setSelectedScene(parsedScenes[0]?.id || null);
        } catch (err: any) {
            setError(err.message || "Failed to generate storyboard");
        } finally {
            setLoading(false);
        }
    };

    // Regenerate single scene image
    const regenerateSceneImage = async (sceneId: string) => {
        const scene = scenes.find(s => s.id === sceneId);
        if (!scene) return;

        setScenes(prev => prev.map(s => 
            s.id === sceneId ? { ...s, isGenerating: true } : s
        ));

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const canvas = document.createElement('canvas');
            canvas.width = 1280;
            canvas.height = 720;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                const colors = selectedStyle.colors.map(c => {
                    const r = parseInt(c.slice(1, 3), 16);
                    const g = parseInt(c.slice(3, 5), 16);
                    const b = parseInt(c.slice(5, 7), 16);
                    return `rgb(${Math.min(255, r + Math.random() * 40)}, ${Math.min(255, g + Math.random() * 40)}, ${Math.min(255, b + Math.random() * 40)})`;
                });
                colors.forEach((color, idx) => {
                    gradient.addColorStop(idx / (colors.length - 1), color);
                });
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.font = 'bold 36px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.textAlign = 'center';
                ctx.fillText(`Scene ${scene.sceneNumber} (v2)`, canvas.width / 2, canvas.height / 2);
            }
            
            const imageData = canvas.toDataURL('image/png').split(',')[1];
            
            setScenes(prev => prev.map(s => 
                s.id === sceneId ? { ...s, imageData, isGenerating: false } : s
            ));
        } catch (err) {
            console.error('Failed to regenerate:', err);
            setScenes(prev => prev.map(s => 
                s.id === sceneId ? { ...s, isGenerating: false } : s
            ));
        }
    };

    // Update scene
    const updateScene = (sceneId: string, updates: Partial<ScriptScene>) => {
        setScenes(prev => prev.map(s => 
            s.id === sceneId ? { ...s, ...updates } : s
        ));
    };

    // Add new scene
    const addScene = () => {
        const newScene: ScriptScene = {
            id: `scene_${Date.now()}`,
            sceneNumber: scenes.length + 1,
            heading: 'INT. NEW SCENE - DAY',
            action: '',
            dialogue: [],
            duration: 30,
            shotType: 'wide',
            cameraMovement: 'static',
            notes: '',
            imageData: null,
            isGenerating: false,
            audioNotes: '',
            props: [],
            location: 'New Location',
            timeOfDay: 'DAY',
        };
        setScenes([...scenes, newScene]);
        setSelectedScene(newScene.id);
    };

    // Delete scene
    const deleteScene = (sceneId: string) => {
        setScenes(prev => prev.filter(s => s.id !== sceneId).map((s, i) => ({ ...s, sceneNumber: i + 1 })));
        if (selectedScene === sceneId) {
            setSelectedScene(scenes[0]?.id || null);
        }
    };

    // File upload handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                setScriptInput(text);
            };
            reader.readAsText(file);
        }
    };

    // Export functions
    const exportAsPDF = () => {
        // In real implementation, use a PDF library
        alert('PDF export would be implemented with a library like jsPDF');
    };

    const exportAsImages = () => {
        scenes.forEach((scene, index) => {
            if (scene.imageData) {
                const link = document.createElement('a');
                link.href = `data:image/png;base64,${scene.imageData}`;
                link.download = `${projectName}_scene_${index + 1}.png`;
                link.click();
            }
        });
    };

    const exportShotList = () => {
        let csv = 'Scene,Shot,Type,Camera,Duration,Equipment,Notes\n';
        shotList.forEach(shot => {
            csv += `${shot.sceneNumber},${shot.shotNumber},${shot.shotType},${shot.cameraMovement},${shot.duration}s,${shot.equipment},"${shot.notes}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${projectName}_shot_list.csv`;
        link.click();
    };

    // Save project
    const saveProject = () => {
        const project: ScriptProject = {
            id: `project_${Date.now()}`,
            name: projectName,
            format: scriptFormat.id,
            scenes,
            shotList,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        setSavedProjects(prev => [project, ...prev]);
    };

    // Load project
    const loadProject = (project: ScriptProject) => {
        setProjectName(project.name);
        setScriptFormat(SCRIPT_FORMATS.find(f => f.id === project.format) || SCRIPT_FORMATS[0]);
        setScenes(project.scenes);
        setShotList(project.shotList);
        setShowProjectsPanel(false);
    };

    // Get selected scene
    const getSelectedScene = () => scenes.find(s => s.id === selectedScene);

    // Format duration
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate total duration
    const totalDuration = scenes.reduce((acc, scene) => acc + scene.duration, 0);

    return (
        <div className="space-y-6">
            {fullScreenImage && (
                <ImageViewer 
                    src={fullScreenImage.src} 
                    alt={fullScreenImage.alt} 
                    onClose={() => setFullScreenImage(null)} 
                />
            )}

            <input ref={fileInputRef} type="file" accept=".txt,.fdx,.fountain" onChange={handleFileUpload} className="hidden" />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        Script Visualizer
                    </h1>
                    <p className="text-slate-400 mt-1">Transform scripts into visual storyboards with AI-powered scene generation</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowProjectsPanel(!showProjectsPanel)}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all ${
                            showProjectsPanel ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                        }`}
                    >
                        <FolderOpen className="w-4 h-4" />
                        Projects
                    </button>
                    <button
                        onClick={() => setShowExportPanel(!showExportPanel)}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all ${
                            showExportPanel ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                        }`}
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={saveProject}
                        disabled={scenes.length === 0}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-xl flex items-center gap-2 text-sm font-bold text-white transition-all disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        Save
                    </button>
                </div>
            </div>

            {/* Export Panel */}
            {showExportPanel && scenes.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-lg font-bold text-white mb-4">Export Options</h3>
                    <div className="flex gap-3">
                        <button
                            onClick={exportAsPDF}
                            className="flex-1 p-4 rounded-xl bg-slate-950/50 border border-white/5 hover:border-cyan-500/30 transition-all text-center"
                        >
                            <FileDown className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                            <span className="text-sm font-medium text-white">Export PDF</span>
                            <p className="text-xs text-slate-500 mt-1">Full storyboard document</p>
                        </button>
                        <button
                            onClick={exportAsImages}
                            className="flex-1 p-4 rounded-xl bg-slate-950/50 border border-white/5 hover:border-cyan-500/30 transition-all text-center"
                        >
                            <ImageIcon className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                            <span className="text-sm font-medium text-white">Export Images</span>
                            <p className="text-xs text-slate-500 mt-1">Individual frame PNGs</p>
                        </button>
                        <button
                            onClick={exportShotList}
                            className="flex-1 p-4 rounded-xl bg-slate-950/50 border border-white/5 hover:border-cyan-500/30 transition-all text-center"
                        >
                            <Table className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                            <span className="text-sm font-medium text-white">Shot List CSV</span>
                            <p className="text-xs text-slate-500 mt-1">Spreadsheet format</p>
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="flex-1 p-4 rounded-xl bg-slate-950/50 border border-white/5 hover:border-cyan-500/30 transition-all text-center"
                        >
                            <Printer className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                            <span className="text-sm font-medium text-white">Print</span>
                            <p className="text-xs text-slate-500 mt-1">Print storyboard</p>
                        </button>
                    </div>
                </div>
            )}

            {/* Projects Panel */}
            {showProjectsPanel && savedProjects.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-lg font-bold text-white mb-4">Saved Projects</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {savedProjects.map(project => (
                            <button
                                key={project.id}
                                onClick={() => loadProject(project)}
                                className="p-4 rounded-xl bg-slate-950/50 border border-white/5 hover:border-cyan-500/30 text-left transition-all"
                            >
                                <h4 className="font-bold text-white truncate">{project.name}</h4>
                                <p className="text-xs text-slate-500 mt-1">{project.scenes.length} scenes • {project.format}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Left Column - Input & Configuration */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Project Info */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Clapperboard className="w-5 h-5 text-cyan-400" />
                            Project Setup
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Project Name</label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-slate-200 focus:ring-2 focus:ring-cyan-500/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Script Format</label>
                                <select
                                    value={scriptFormat.id}
                                    onChange={(e) => setScriptFormat(SCRIPT_FORMATS.find(f => f.id === e.target.value) || SCRIPT_FORMATS[0])}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-300"
                                >
                                    {SCRIPT_FORMATS.map(format => (
                                        <option key={format.id} value={format.id}>{format.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Script Input */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-cyan-400" />
                            Script Input
                        </h3>

                        {/* Input Mode Toggle */}
                        <div className="flex gap-2 p-1 bg-slate-950/50 rounded-xl">
                            <button
                                onClick={() => setInputMode('paste')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    inputMode === 'paste' 
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                                        : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                <Clipboard className="w-4 h-4" /> Paste
                            </button>
                            <button
                                onClick={() => setInputMode('upload')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    inputMode === 'upload' 
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                                        : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                <Upload className="w-4 h-4" /> Upload
                            </button>
                            <button
                                onClick={() => setInputMode('generate')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    inputMode === 'generate' 
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                                        : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                <Wand2 className="w-4 h-4" /> Generate
                            </button>
                        </div>

                        {inputMode === 'paste' && (
                            <textarea
                                value={scriptInput}
                                onChange={(e) => setScriptInput(e.target.value)}
                                placeholder="Paste your script here...

INT. COFFEE SHOP - DAY

A busy morning. CUSTOMERS line up at the counter.

BARISTA
What can I get you?

..."
                                className="w-full h-48 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-500/50 resize-none font-mono"
                            />
                        )}

                        {inputMode === 'upload' && (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-32 border border-dashed border-white/10 rounded-xl bg-slate-950/30 hover:bg-white/5 hover:border-cyan-500/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                            >
                                {scriptInput ? (
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                        <Check className="w-4 h-4" /> Script Loaded ({scriptInput.length} chars)
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-slate-500" />
                                        <span className="text-sm text-slate-400">Click to upload script file</span>
                                        <span className="text-xs text-slate-600">.txt, .fdx, .fountain</span>
                                    </>
                                )}
                            </div>
                        )}

                        {inputMode === 'generate' && (
                            <div className="space-y-3">
                                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                    <p className="text-xs text-cyan-300 flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4" />
                                        AI will generate a complete script based on your description
                                    </p>
                                </div>
                                <textarea
                                    value={generatePrompt}
                                    onChange={(e) => setGeneratePrompt(e.target.value)}
                                    placeholder="Describe your video concept...

e.g., A 60-second commercial for a coffee brand showing the journey from bean to cup, with warm, inviting visuals..."
                                    className="w-full h-32 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-500/50 resize-none"
                                />
                            </div>
                        )}
                    </div>

                    {/* Visual Style */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Palette className="w-5 h-5 text-cyan-400" />
                            Visual Style
                        </h3>

                        <div className="grid grid-cols-2 gap-2">
                            {VISUAL_STYLES.slice(0, 4).map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => setSelectedStyle(style)}
                                    className={`p-3 rounded-xl text-left transition-all ${
                                        selectedStyle.id === style.id
                                            ? 'bg-cyan-500/20 border border-cyan-500/30'
                                            : 'bg-slate-950/50 border border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex gap-1 mb-2">
                                        {style.colors.map((color, i) => (
                                            <div 
                                                key={i}
                                                className="w-4 h-4 rounded-full border border-white/20"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs font-medium text-white">{style.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-300">Generate Images</span>
                            <button
                                onClick={() => setGenerateImages(!generateImages)}
                                className={`w-10 h-6 rounded-full transition-colors ${generateImages ? 'bg-cyan-500' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${generateImages ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Advanced Options */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 space-y-4">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between text-white"
                        >
                            <span className="flex items-center gap-2 font-bold">
                                <Sliders className="w-5 h-5 text-cyan-400" />
                                Advanced Options
                            </span>
                            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>

                        {showAdvanced && (
                            <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500">Aspect Ratio</label>
                                        <select
                                            value={aspectRatio}
                                            onChange={(e) => setAspectRatio(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300"
                                        >
                                            <option value="16:9">16:9 (Widescreen)</option>
                                            <option value="9:16">9:16 (Vertical)</option>
                                            <option value="1:1">1:1 (Square)</option>
                                            <option value="4:3">4:3 (Classic)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-500">Frames per Scene</label>
                                        <select
                                            value={framesPerScene}
                                            onChange={(e) => setFramesPerScene(parseInt(e.target.value))}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300"
                                        >
                                            {[1, 2, 3, 4, 5].map(num => (
                                                <option key={num} value={num}>{num} frame{num > 1 ? 's' : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm text-slate-300">Include Shot List</span>
                                        <button
                                            onClick={() => setIncludeShotList(!includeShotList)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeShotList ? 'bg-cyan-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeShotList ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm text-slate-300">Audio Notes</span>
                                        <button
                                            onClick={() => setIncludeAudioNotes(!includeAudioNotes)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeAudioNotes ? 'bg-cyan-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeAudioNotes ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm text-slate-300">Timecodes</span>
                                        <button
                                            onClick={() => setIncludeTimecodes(!includeTimecodes)}
                                            className={`w-10 h-6 rounded-full transition-colors ${includeTimecodes ? 'bg-cyan-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeTimecodes ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={generateStoryboard}
                        disabled={loading || (inputMode !== 'generate' && !scriptInput) || (inputMode === 'generate' && !generatePrompt)}
                        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {loadingStage || 'Processing...'}
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-5 h-5" />
                                Generate Storyboard
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
                <div className="lg:col-span-8 space-y-6">
                    {/* Toolbar */}
                    {scenes.length > 0 && (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/5">
                            <div className="flex items-center gap-2">
                                {/* View Mode */}
                                <div className="flex gap-1 p-1 bg-slate-950/50 rounded-lg">
                                    <button
                                        onClick={() => setViewMode('storyboard')}
                                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                                            viewMode === 'storyboard' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Grid3X3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('script')}
                                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                                            viewMode === 'script' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('shotlist')}
                                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                                            viewMode === 'shotlist' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('split')}
                                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                                            viewMode === 'split' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Layers className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Stats */}
                                <div className="ml-4 flex items-center gap-4 text-sm">
                                    <span className="text-slate-500">{scenes.length} scenes</span>
                                    <span className="text-cyan-400 font-mono">{formatDuration(totalDuration)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={addScene}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 flex items-center gap-2 text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Scene
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col items-center justify-center">
                            <div className="w-20 h-20 relative mb-6">
                                <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-cyan-400 font-mono text-sm animate-pulse uppercase tracking-wider">{loadingStage}</p>
                        </div>
                    )}

                    {/* Storyboard View */}
                    {!loading && viewMode === 'storyboard' && scenes.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
                            {scenes.map((scene, index) => (
                                <div
                                    key={scene.id}
                                    onClick={() => setSelectedScene(scene.id)}
                                    className={`relative group rounded-xl overflow-hidden border transition-all cursor-pointer ${
                                        selectedScene === scene.id 
                                            ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
                                            : 'border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {scene.isGenerating ? (
                                        <div className="aspect-video bg-slate-900 flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                                        </div>
                                    ) : scene.imageData ? (
                                        <img 
                                            src={`data:image/png;base64,${scene.imageData}`}
                                            alt={scene.heading}
                                            className="aspect-video object-cover"
                                        />
                                    ) : (
                                        <div className="aspect-video bg-slate-900 flex items-center justify-center">
                                            <ImageIcon className="w-8 h-8 text-slate-700" />
                                        </div>
                                    )}

                                    {/* Scene info overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                                        <div className="absolute bottom-0 left-0 right-0 p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded font-bold">
                                                    {scene.sceneNumber}
                                                </span>
                                                <span className="text-xs text-slate-400">{scene.duration}s</span>
                                            </div>
                                            <p className="text-sm font-medium text-white truncate">{scene.heading}</p>
                                        </div>
                                    </div>

                                    {/* Hover actions */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); regenerateSceneImage(scene.id); }}
                                            className="p-1.5 bg-black/50 hover:bg-cyan-500 rounded-lg transition-colors"
                                        >
                                            <RefreshCw className="w-3 h-3 text-white" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }}
                                            className="p-1.5 bg-black/50 hover:bg-red-500 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Script View */}
                    {!loading && viewMode === 'script' && scenes.length > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            {scenes.map((scene) => (
                                <div
                                    key={scene.id}
                                    onClick={() => setSelectedScene(scene.id)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                        selectedScene === scene.id 
                                            ? 'bg-cyan-500/10 border-cyan-500/30' 
                                            : 'bg-slate-900/50 border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="font-mono text-sm space-y-2">
                                        <p className="text-cyan-400 font-bold">{scene.heading}</p>
                                        <p className="text-slate-300">{scene.action}</p>
                                        {scene.dialogue.map((d, i) => (
                                            <div key={i} className="ml-8">
                                                <p className="text-amber-400 font-bold">{d.character}</p>
                                                <p className="text-slate-300 ml-4">{d.line}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Shot List View */}
                    {!loading && viewMode === 'shotlist' && shotList.length > 0 && (
                        <div className="rounded-xl overflow-hidden border border-white/5 animate-in fade-in slide-in-from-bottom-4">
                            <table className="w-full">
                                <thead className="bg-slate-900/80">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Scene</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Shot</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Camera</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Duration</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {shotList.map((shot) => (
                                        <tr key={shot.id} className="bg-slate-900/30 hover:bg-slate-900/50">
                                            <td className="px-4 py-3 text-sm text-white font-mono">{shot.sceneNumber}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{shot.shotNumber}</td>
                                            <td className="px-4 py-3 text-sm text-cyan-400">{SHOT_TYPES.find(s => s.id === shot.shotType)?.name || shot.shotType}</td>
                                            <td className="px-4 py-3 text-sm text-slate-400">{CAMERA_MOVEMENTS.find(c => c.id === shot.cameraMovement)?.name || shot.cameraMovement}</td>
                                            <td className="px-4 py-3 text-sm text-slate-400">{shot.duration}s</td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{shot.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Split View */}
                    {!loading && viewMode === 'split' && scenes.length > 0 && getSelectedScene() && (
                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                            {/* Image */}
                            <div className="space-y-4">
                                <div className="rounded-xl overflow-hidden border border-white/10">
                                    {getSelectedScene()?.imageData ? (
                                        <img 
                                            src={`data:image/png;base64,${getSelectedScene()?.imageData}`}
                                            alt={getSelectedScene()?.heading}
                                            className="w-full aspect-video object-cover"
                                        />
                                    ) : (
                                        <div className="w-full aspect-video bg-slate-900 flex items-center justify-center">
                                            <ImageIcon className="w-12 h-12 text-slate-700" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => regenerateSceneImage(selectedScene!)}
                                        className="flex-1 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Regenerate
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (getSelectedScene()?.imageData) {
                                                setFullScreenImage({
                                                    src: `data:image/png;base64,${getSelectedScene()?.imageData}`,
                                                    alt: getSelectedScene()?.heading || ''
                                                });
                                            }
                                        }}
                                        className="py-2 px-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm font-medium"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Scene Details */}
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-white">Scene {getSelectedScene()?.sceneNumber}</h4>
                                        <span className="text-sm text-slate-500">{getSelectedScene()?.duration}s</span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">Heading</label>
                                            <input
                                                type="text"
                                                value={getSelectedScene()?.heading || ''}
                                                onChange={(e) => updateScene(selectedScene!, { heading: e.target.value })}
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">Action</label>
                                            <textarea
                                                value={getSelectedScene()?.action || ''}
                                                onChange={(e) => updateScene(selectedScene!, { action: e.target.value })}
                                                className="w-full h-24 bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 resize-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-500">Shot Type</label>
                                                <select
                                                    value={getSelectedScene()?.shotType || 'wide'}
                                                    onChange={(e) => updateScene(selectedScene!, { shotType: e.target.value })}
                                                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300"
                                                >
                                                    {SHOT_TYPES.map(type => (
                                                        <option key={type.id} value={type.id}>{type.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-500">Camera</label>
                                                <select
                                                    value={getSelectedScene()?.cameraMovement || 'static'}
                                                    onChange={(e) => updateScene(selectedScene!, { cameraMovement: e.target.value })}
                                                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300"
                                                >
                                                    {CAMERA_MOVEMENTS.map(movement => (
                                                        <option key={movement.id} value={movement.id}>{movement.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">Notes</label>
                                            <textarea
                                                value={getSelectedScene()?.notes || ''}
                                                onChange={(e) => updateScene(selectedScene!, { notes: e.target.value })}
                                                placeholder="Director notes, special instructions..."
                                                className="w-full h-16 bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && scenes.length === 0 && (
                        <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8 text-cyan-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Visualize Your Script</h3>
                            <p className="text-slate-500 max-w-md">
                                Paste your script, upload a file, or generate one from a description to create a visual storyboard with AI-powered scene generation.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScriptVisualizer;
