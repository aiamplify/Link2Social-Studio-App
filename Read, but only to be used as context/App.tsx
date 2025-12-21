import React, { useState } from 'react';
import { VideoUploader } from './components/VideoUploader';
import { BlogPost } from './components/BlogPost';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { VideoModal } from './components/VideoModal';
import { BlogPostState, BlogConfiguration, VideoSegment } from './types';
import { extractFramesFromVideo } from './services/videoUtils';
import { generateBlogPostFromFrames, generateVideoScript, generateVoiceover } from './services/geminiService';
import { Sparkles, Video, FileText, AlertCircle, Settings2 } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<BlogPostState>({
    status: 'idle',
    progress: 0,
    frames: []
  });

  const handleFileSelect = async (file: File) => {
    setState({ ...state, status: 'processing_video', progress: 0, videoName: file.name });

    try {
      // 1. Extract Frames
      // Increased to 24 to ensure we capture key moments (steps) accurately.
      // The video generation service will group these into fewer segments to avoid rate limits.
      const frames = await extractFramesFromVideo(file, 24, (prog) => {
        setState(prev => ({ ...prev, progress: prog }));
      });
      
      // 2. Move to Configuration State
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
        error: error.message || "An unexpected error occurred."
      }));
    }
  };

  const handleGenerate = async (config: BlogConfiguration) => {
    setState(prev => ({ ...prev, status: 'generating_text', config }));

    try {
      const generatedText = await generateBlogPostFromFrames(state.frames, config);

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
        error: error.message || "An unexpected error occurred."
      }));
    }
  };

  const handleGenerateVideo = async () => {
    if (!state.markdownContent || !state.frames.length) return;

    // Open Modal
    setState(prev => ({
        ...prev,
        video: { isActive: true, status: 'generating_script', script: [], currentSegmentIndex: 0 }
    }));

    try {
        // 1. Generate Script
        const script = await generateVideoScript(state.markdownContent, state.frames.length);
        
        setState(prev => ({
            ...prev,
            video: { ...prev.video!, status: 'synthesizing_audio', script }
        }));

        // 2. Synthesize Audio for each segment SEQUENTIALLY to avoid 503/429 Overload
        const scriptWithAudio: VideoSegment[] = [];
        
        for (const seg of script) {
            try {
                // Keep the conservative 4s delay to respect quotas
                await new Promise(r => setTimeout(r, 4000));
                
                const audioData = await generateVoiceover(seg.text);
                scriptWithAudio.push({ ...seg, audioData });
            } catch (e: any) {
                // Handle Quota errors gracefully without spamming console
                if (e.message?.includes('429') || e.message?.includes('quota') || e.status === 429) {
                     console.warn(`Quota/Rate limit hit for segment: "${seg.text.substring(0, 15)}...". Audio skipped to preserve playback.`);
                } else {
                     console.error(`Failed to synth audio for segment "${seg.text.substring(0, 15)}..."`, e);
                }
                
                // We keep the segment but without audio, allowing visual fallback (timer)
                scriptWithAudio.push(seg);
            }
        }

        setState(prev => ({
            ...prev,
            video: { ...prev.video!, status: 'ready', script: scriptWithAudio }
        }));

    } catch (error) {
        console.error("Video Generation Error", error);
        alert("Failed to create video. Please try again.");
        setState(prev => ({ ...prev, video: undefined }));
    }
  };

  const handleCloseVideo = () => {
    setState(prev => ({ ...prev, video: undefined }));
  };

  const handleReset = () => {
    setState({
      status: 'idle',
      progress: 0,
      frames: []
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-serif text-xl font-bold text-slate-800 tracking-tight">Vid2Blog</span>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-medium text-slate-500">
             {state.status === 'configuring' && (
               <span className="flex items-center gap-2 text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
                  <Settings2 className="w-4 h-4" /> Configuring
               </span>
             )}
             {state.status === 'complete' && (
               <span className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <FileText className="w-4 h-4" /> Published
               </span>
             )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {state.status === 'idle' && (
          <div className="flex flex-col items-center justify-center space-y-12 animate-fade-in">
            <div className="text-center max-w-2xl mx-auto space-y-6">
              <h1 className="text-4xl md:text-6xl font-serif font-black text-slate-900 leading-tight">
                Turn your videos into <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-blue-600">masterpiece blogs</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
                Upload a screen recording. Configure style, tone, and length. Get a perfectly formatted tutorial in seconds.
              </p>
            </div>

            <VideoUploader onFileSelect={handleFileSelect} isLoading={false} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mt-12">
              <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <Video className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">1. Upload Video</h3>
                <p className="text-sm text-slate-500">Drag and drop any tutorial video.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center mb-4">
                  <Settings2 className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">2. Configure</h3>
                <p className="text-sm text-slate-500">Choose fonts, themes, tone, and length.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">3. Publish</h3>
                <p className="text-sm text-slate-500">Get a fully styled, illustrated article.</p>
              </div>
            </div>
          </div>
        )}

        {state.status === 'processing_video' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
             <div className="w-24 h-24 relative mb-8">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-brand-600">{state.progress}%</span>
                </div>
             </div>
             <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Analyzing Video</h2>
             <p className="text-slate-500">Extracting key frames for your blog post...</p>
          </div>
        )}

        {state.status === 'configuring' && (
          <ConfigurationPanel onGenerate={handleGenerate} videoName={state.videoName} />
        )}

        {state.status === 'generating_text' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
             <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-brand-500 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-purple-200 animate-bounce">
                <Sparkles className="w-10 h-10" />
             </div>
             <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Crafting your Article</h2>
             <p className="text-slate-500 max-w-md text-center">Gemini AI is writing a {state.config?.length} {state.config?.tone} post with {state.config?.theme} styling...</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
             <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-bold text-slate-800 mb-4">Something went wrong</h2>
             <p className="text-slate-500 mb-8 max-w-md text-center">{state.error}</p>
             <button 
              onClick={handleReset}
              className="px-6 py-3 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors"
             >
               Try Again
             </button>
          </div>
        )}

        {state.status === 'complete' && state.markdownContent && state.config && (
          <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-center bg-green-50 p-4 rounded-lg border border-green-100 text-green-800">
               <div className="flex items-center gap-3">
                  <div className="bg-green-200 p-1 rounded-full"><Sparkles className="w-4 h-4 text-green-700" /></div>
                  <span className="font-medium">Success! Your blog post is ready.</span>
               </div>
               <button onClick={handleReset} className="text-sm hover:underline font-medium">Create New</button>
            </div>
            
            <BlogPost 
              content={state.markdownContent} 
              frames={state.frames} 
              config={state.config} 
              onGenerateVideo={handleGenerateVideo}
            />

            {state.video?.isActive && (
                <VideoModal 
                    script={state.video.script} 
                    frames={state.frames} 
                    status={state.video.status} 
                    onClose={handleCloseVideo}
                />
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default App;