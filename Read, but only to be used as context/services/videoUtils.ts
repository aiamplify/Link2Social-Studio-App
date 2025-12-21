import { ProcessedFrame } from '../types';

/**
 * Extracts evenly distributed frames from a video file.
 * @param file The video file to process
 * @param numFrames Target number of frames to extract
 * @param onProgress Callback for progress updates
 */
export const extractFramesFromVideo = async (
  file: File,
  numFrames: number = 12,
  onProgress?: (progress: number) => void
): Promise<ProcessedFrame[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: ProcessedFrame[] = [];
    
    if (!context) {
      reject(new Error("Could not create canvas context"));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous"; 
    video.preload = 'auto'; // Change to auto to encourage loading

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      // Calculate intervals.
      const interval = duration / (numFrames + 1);
      
      // Default to 800 if width not available yet
      canvas.width = 800; 
      
      const captureFrame = async (index: number) => {
        if (index >= numFrames) {
          URL.revokeObjectURL(objectUrl);
          resolve(frames);
          return;
        }

        const currentTime = interval * (index + 1);
        video.currentTime = currentTime;
      };

      video.onseeked = async () => {
        // Increased delay to 300ms to ensure the video buffer has updated the visual frame
        // This is crucial for obtaining consistent, non-blurry screenshots
        await new Promise(r => setTimeout(r, 300));

        if (video.videoWidth > 0 && video.videoHeight > 0) {
            const ratio = video.videoHeight / video.videoWidth;
            canvas.height = canvas.width * ratio;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            // Only push if valid length (sanity check)
            if (dataUrl.length > 100) {
                frames.push({
                    index: frames.length,
                    dataUrl,
                    timestamp: video.currentTime
                });
            }
        }

        if (onProgress) {
          onProgress(Math.round(((frames.length) / numFrames) * 100));
        }

        captureFrame(frames.length);
      };

      // Start capturing
      captureFrame(0);
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Error loading video file. content may be corrupt."));
    };
  });
};