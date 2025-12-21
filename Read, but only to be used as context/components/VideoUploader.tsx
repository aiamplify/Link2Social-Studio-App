import React, { useRef, useState } from 'react';
import { Upload, FileVideo, Youtube, AlertCircle } from 'lucide-react';
import { Tab } from '../types';

interface VideoUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileSelect, isLoading }) => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.UPLOAD);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type.startsWith('video/')) {
      onFileSelect(file);
    } else {
      alert("Please upload a valid video file.");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
      <div className="flex border-b border-slate-100">
        <button
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === Tab.UPLOAD
              ? 'text-brand-600 bg-brand-50 border-b-2 border-brand-500'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
          onClick={() => setActiveTab(Tab.UPLOAD)}
        >
          <Upload className="w-4 h-4" />
          Upload Video
        </button>
        <button
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === Tab.YOUTUBE
              ? 'text-brand-600 bg-brand-50 border-b-2 border-brand-500'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
          onClick={() => setActiveTab(Tab.YOUTUBE)}
        >
          <Youtube className="w-4 h-4" />
          YouTube URL
        </button>
      </div>

      <div className="p-8 min-h-[300px] flex flex-col items-center justify-center">
        {activeTab === Tab.UPLOAD ? (
          <div
            className={`w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
              dragActive
                ? 'border-brand-500 bg-brand-50 scale-[1.02]'
                : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
            } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
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
            <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <FileVideo className="w-8 h-8" />
            </div>
            <p className="text-lg font-semibold text-slate-700 mb-2">
              Drag & drop your video here
            </p>
            <p className="text-sm text-slate-500">
              MP4, WebM, MOV up to 100MB (recommended)
            </p>
            <button className="mt-6 px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-sm font-medium transition-colors shadow-sm">
              Select File
            </button>
          </div>
        ) : (
          <div className="w-full text-center">
             <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Youtube className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">YouTube Import Unavailable</h3>
             <div className="max-w-md mx-auto bg-amber-50 text-amber-800 p-4 rounded-lg text-sm flex gap-3 items-start text-left">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Due to browser security restrictions (CORS) and YouTube's terms, we cannot extract video frames directly from a YouTube URL in this client-side demo. 
                <br/><br/>
                <strong>Please use the "Upload Video" tab</strong> to experience the full screenshot-to-blog-post capability!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
