import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Download, Loader2, Video as VideoIcon, Package, FileAudio, Image as ImageIcon, FileText } from 'lucide-react';
import { VideoSegment, ProcessedFrame } from '../types';
import JSZip from 'jszip';

interface VideoModalProps {
  script: VideoSegment[];
  frames: ProcessedFrame[];
  onClose: () => void;
  status: 'generating_script' | 'synthesizing_audio' | 'ready';
}

// --- Helper: Create WAV Header for Raw PCM ---
const createWavFile = (base64PCM: string): ArrayBuffer => {
    const binaryString = atob(base64PCM);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + len, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // AudioFormat 1 = PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, 24000, true); // SampleRate
    view.setUint32(28, 24000 * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample

    writeString(36, 'data');
    view.setUint32(40, len, true);

    const tmp = new Uint8Array(wavHeader.byteLength + bytes.byteLength);
    tmp.set(new Uint8Array(wavHeader), 0);
    tmp.set(bytes, wavHeader.byteLength);

    return tmp.buffer;
};

export const VideoModal: React.FC<VideoModalProps> = ({ script, frames, onClose, status }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [activeSource, setActiveSource] = useState<AudioBufferSourceNode | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Refs for cleanup and callbacks
  const timerRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const currentIndexRef = useRef(0);

  // Initialize Audio Context
  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    setAudioContext(ctx);
    return () => {
      ctx.close();
    };
  }, []);

  // Update refs when state changes
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    currentIndexRef.current = currentIndex;
  }, [isPlaying, currentIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        if (activeSource) {
            try { activeSource.stop(); } catch(e) {}
        }
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };
  }, [activeSource]);

  // Draw current frame to canvas
  useEffect(() => {
    if (canvasRef.current && frames.length > 0 && script[currentIndex]) {
      const ctx = canvasRef.current.getContext('2d');
      const frameIndex = script[currentIndex].frameIndex;
      const frame = frames[Math.min(frameIndex, frames.length - 1)]; // Safety clamp
      
      const img = new Image();
      img.onload = () => {
        if (!ctx || !canvasRef.current) return;
        // Draw black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Draw image "fit" contain style
        const scale = Math.min(
            canvasRef.current.width / img.width,
            canvasRef.current.height / img.height
        );
        const x = (canvasRef.current.width / 2) - (img.width / 2) * scale;
        const y = (canvasRef.current.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      };
      img.src = frame.dataUrl;
    }
  }, [currentIndex, frames, script]);

  // Manual PCM Decode function for Gemini raw audio
  const decodePCM = (base64: string, ctx: AudioContext): AudioBuffer => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Raw PCM is 16-bit (2 bytes per sample), Little Endian
    const dataInt16 = new Int16Array(bytes.buffer);
    const numChannels = 1;
    const sampleRate = 24000;
    const frameCount = dataInt16.length / numChannels;
    
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    
    return buffer;
  };

  const playSegment = async (index: number) => {
    if (!audioContext || !script[index]) return;
    
    // Cleanup previous
    if (activeSource) {
      try { activeSource.stop(); } catch(e) {}
    }
    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }

    const segment = script[index];
    const hasAudio = !!segment.audioData;
    
    const handleSegmentEnd = () => {
        if (!isPlayingRef.current) return;

        if (index < script.length - 1) {
            setCurrentIndex(index + 1);
            playSegment(index + 1);
        } else {
            setIsPlaying(false);
            setCurrentIndex(0); // Reset to start
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                setIsRecording(false);
            }
        }
    };

    if (hasAudio) {
        try {
            const buffer = decodePCM(segment.audioData!, audioContext);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            
            source.onended = handleSegmentEnd;
            setActiveSource(source);
            source.start(0);
        } catch (e) {
            console.error("Error decoding audio, falling back to timer", e);
            // Fallback duration if decode fails
            const duration = Math.max(2000, (segment.text.length / 5) * 300);
            timerRef.current = window.setTimeout(handleSegmentEnd, duration);
        }
    } else {
        // No audio data (maybe failed generation), use timer based on text length
        // Approx 300ms per word or 60ms per char
        const duration = Math.max(2000, (segment.text.length / 5) * 300);
        timerRef.current = window.setTimeout(handleSegmentEnd, duration);
    }
    
    // Update index visually
    setCurrentIndex(index);
  };

  const handlePlay = () => {
    if (audioContext?.state === 'suspended') {
        audioContext.resume();
    }
    setIsPlaying(true);
    playSegment(currentIndex);
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (activeSource) {
        try { activeSource.stop(); } catch(e) {}
    }
    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }
  };

  const handleDownloadVideo = () => {
    if (!canvasRef.current || !audioContext) return;
    if (isRecording) return;
    
    setIsRecording(true);
    
    // Determine supported mime type, prioritizing MP4
    let mimeType = 'video/webm';
    let fileExtension = 'webm';

    if (MediaRecorder.isTypeSupported('video/mp4; codecs=avc1')) {
        mimeType = 'video/mp4; codecs=avc1';
        fileExtension = 'mp4';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
        fileExtension = 'mp4';
    }

    const stream = canvasRef.current.captureStream(30); // 30 FPS
    
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tutorial-video.${fileExtension}`;
        a.click();
        setIsRecording(false);
        setIsPlaying(false);
    };
    
    setMediaRecorder(recorder);
    recorder.start();
    
    // Start playback from 0
    setIsPlaying(true);
    setCurrentIndex(0);
    playSegment(0); 
  };

  const handleDownloadZip = async () => {
      if (isZipping) return;
      setIsZipping(true);

      try {
          const zip = new JSZip();
          const assetsFolder = zip.folder("vid2blog_project");
          
          if (!assetsFolder) return;

          // 1. Add Script
          const scriptText = script.map(s => `[Frame ${s.frameIndex}]\nVoiceover: ${s.text}\n`).join('\n');
          assetsFolder.file("script.txt", scriptText);

          // 2. Add Images
          const imagesFolder = assetsFolder.folder("images");
          frames.forEach((frame) => {
              const base64Data = frame.dataUrl.split(',')[1];
              imagesFolder?.file(`frame_${frame.index.toString().padStart(3, '0')}.jpg`, base64Data, {base64: true});
          });

          // 3. Add Audio
          const audioFolder = assetsFolder.folder("audio");
          script.forEach((seg, i) => {
              if (seg.audioData) {
                  const wavBuffer = createWavFile(seg.audioData);
                  audioFolder?.file(`segment_${i.toString().padStart(3, '0')}.wav`, wavBuffer);
              }
          });

          // 4. Generate Zip
          const content = await zip.generateAsync({type: "blob"});
          const url = URL.createObjectURL(content);
          const a = document.createElement('a');
          a.href = url;
          a.download = "vid2blog_project.zip";
          a.click();

      } catch (e) {
          console.error("Failed to zip assets", e);
          alert("Failed to create zip file.");
      } finally {
          setIsZipping(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md animate-fade-in p-4">
      <div className="bg-slate-950 w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-800">
        
        {/* Header */}
        <div className="p-4 flex justify-between items-center bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-500/10 rounded-lg">
                    <VideoIcon className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                    <h3 className="text-white font-medium">
                        {status === 'ready' ? 'Final Video Preview' : 'Generating Video...'}
                    </h3>
                    <p className="text-slate-500 text-xs">
                         {status === 'ready' ? 'Review and download your creation' : 'Please wait while AI creates your video'}
                    </p>
                </div>
            </div>
            <button onClick={() => {
                handleStop();
                onClose();
            }} className="text-slate-400 hover:text-white transition-colors hover:bg-slate-800 p-2 rounded-full">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Player Column */}
            <div className="flex-1 bg-black flex flex-col relative group">
                <div className="flex-1 flex items-center justify-center p-4">
                    {status !== 'ready' ? (
                        <div className="text-center space-y-6 max-w-sm">
                            <div className="relative mx-auto w-16 h-16">
                                <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                            <div>
                                <h4 className="text-white text-lg font-medium mb-2">
                                    {status === 'generating_script' ? 'Writing Script...' : 'Synthesizing Audio...'}
                                </h4>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Our AI is analyzing your blog post and generating a professional voiceover synchronized with your screenshots.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <canvas 
                                ref={canvasRef} 
                                width={1280} 
                                height={720} 
                                className="w-full h-auto max-h-full object-contain shadow-2xl"
                            />
                            {/* Overlay Play Button (Only when paused) */}
                            {!isPlaying && !isRecording && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors cursor-pointer" onClick={handlePlay}>
                                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-xl hover:scale-110 transition-transform group-hover:bg-brand-500 group-hover:border-brand-400 group-hover:text-white text-white">
                                        <Play className="w-8 h-8 fill-current ml-1" />
                                    </div>
                                </div>
                            )}
                            
                            {/* Recording Indicator */}
                            {isRecording && (
                                <div className="absolute top-6 right-6 bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold animate-pulse shadow-lg backdrop-blur-sm z-20">
                                    <div className="w-3 h-3 bg-white rounded-full"></div>
                                    Recording...
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Player Controls Bar */}
                {status === 'ready' && (
                    <div className="h-16 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 inset-x-0 flex items-center px-6 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={isPlaying ? handleStop : handlePlay} className="text-white hover:text-brand-400 transition-colors">
                            {isPlaying ? <Pause className="w-8 h-8 fill-current"/> : <Play className="w-8 h-8 fill-current"/>}
                         </button>
                    </div>
                )}
            </div>

            {/* Sidebar / Info Column */}
            {status === 'ready' && (
                <div className="w-full md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {/* Current Segment Info */}
                        <div className="space-y-3">
                            <span className="text-xs font-bold text-brand-500 uppercase tracking-wider">Now Playing</span>
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                <p className="text-slate-300 text-lg font-serif italic leading-relaxed">
                                    "{script[currentIndex]?.text}"
                                </p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <div className="text-slate-400 text-xs mb-1">Segments</div>
                                <div className="text-white text-xl font-bold">{script.length}</div>
                            </div>
                             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <div className="text-slate-400 text-xs mb-1">Frames</div>
                                <div className="text-white text-xl font-bold">{frames.length}</div>
                            </div>
                        </div>
                    </div>

                    {/* Download Actions */}
                    <div className="p-6 bg-slate-950 border-t border-slate-800 space-y-3">
                        <button 
                            onClick={handleDownloadVideo}
                            disabled={isRecording}
                            className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-white shadow-lg transition-all ${
                                isRecording 
                                ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                                : 'bg-brand-600 hover:bg-brand-500 hover:shadow-brand-500/20 active:scale-[0.98]'
                            }`}
                        >
                            {isRecording ? <Loader2 className="w-5 h-5 animate-spin"/> : <VideoIcon className="w-5 h-5" />}
                            {isRecording ? 'Recording Video...' : 'Download Video (.mp4)'}
                        </button>

                        <button 
                            onClick={handleDownloadZip}
                            disabled={isZipping || isRecording}
                            className="w-full flex items-center justify-center gap-3 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium border border-slate-700 transition-all hover:border-slate-600 active:scale-[0.98]"
                        >
                             {isZipping ? <Loader2 className="w-5 h-5 animate-spin"/> : <Package className="w-5 h-5" />}
                             Download All Assets (Zip)
                        </button>
                        
                        <p className="text-center text-xs text-slate-500 mt-2">
                           Zip includes: Script, Audio (.wav), Frames (.jpg)
                        </p>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};