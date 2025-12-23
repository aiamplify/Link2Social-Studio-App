/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoFrame, VideoBlogConfiguration } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

// Helper to get a fresh AI client
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Extracts evenly distributed frames from a video file.
 */
export const extractFramesFromVideo = async (
  file: File,
  numFrames: number = 16,
  onProgress?: (progress: number) => void
): Promise<VideoFrame[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: VideoFrame[] = [];

    if (!context) {
      reject(new Error("Could not create canvas context"));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.preload = 'auto';

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const interval = duration / (numFrames + 1);

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
        await new Promise(r => setTimeout(r, 300));

        if (video.videoWidth > 0 && video.videoHeight > 0) {
            const ratio = video.videoHeight / video.videoWidth;
            canvas.height = canvas.width * ratio;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

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

      captureFrame(0);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Error loading video file. Content may be corrupt."));
    };
  });
};

// Retry logic for API calls
async function withRetry<T>(operation: () => Promise<T>, retries = 3, baseDelay = 3000): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || '';
      const isOverloaded =
        errorMessage.includes('503') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('429');

      if (isOverloaded && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`API overloaded (Attempt ${i + 1}/${retries}). Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Generate a blog post from video frames using Gemini AI
 */
export const generateBlogFromVideo = async (
  frames: VideoFrame[],
  config: VideoBlogConfiguration
): Promise<string> => {
  const ai = getAiClient();

  const lengthInstruction = {
    short: "Keep the blog post concise, roughly 400-600 words. Focus on the core steps.",
    medium: "Write a balanced blog post, roughly 800-1200 words. Provide good detail for each step.",
    long: "Write an in-depth, comprehensive guide, roughly 1500+ words. Elaborate on every detail, add tips, context, and troubleshooting.",
  }[config.length];

  const toneInstruction = `Adopt a ${config.tone} tone.`;
  const audienceInstruction = `Target audience: ${config.targetAudience}. Adjust vocabulary and complexity accordingly.`;
  const conclusionInstruction = config.includeConclusion
    ? "Include a summarizing conclusion at the end."
    : "Do not include a formal conclusion.";

  const SYSTEM_INSTRUCTION = `
You are an expert technical content writer and instructional designer.
Your goal is to transform a visual sequence of steps from a video tutorial into a high-quality, engaging blog post.

**Input:**
You will receive a sequence of images (frames) extracted from a video tutorial.
NOTE: You may receive many images. Some may be redundant or transitional.

**Configuration Parameters:**
1.  **Length:** ${lengthInstruction}
2.  **Tone:** ${toneInstruction}
3.  **Audience:** ${audienceInstruction}
4.  **Structure:** ${conclusionInstruction}

**Output Requirements:**
1.  **Title:** Create a catchy, SEO-friendly title for the tutorial.
2.  **Introduction:** Write a brief introduction explaining what the tutorial covers and why it is useful.
3.  **Step-by-Step Instructions:** Break down the process into clear, numbered steps.
4.  **Visual Illustration (CRITICAL - MUST USE ALL IMAGES):**
    - You MUST include EVERY SINGLE image provided in the blog post. No exceptions.
    - Each image should be placed at the most relevant point in the content to illustrate that specific moment or step.
    - For each image, insert a placeholder tag: \`[[IMAGE_index]]\` where \`index\` is the image number (0 to ${frames.length - 1}).
    - Write descriptive context around each image so readers understand exactly what they are seeing.
    - Even if images appear similar, include them all - they show progression and subtle changes that help readers follow along.
    - IMPORTANT: Do NOT wrap the placeholder in Markdown image syntax. Just write \`[[IMAGE_index]]\` on its own line.
    - IMPORTANT: You MUST use all ${frames.length} images: [[IMAGE_0]] through [[IMAGE_${frames.length - 1}]].
5.  **Formatting:** Use standard Markdown. H2 (##) for main sections, H3 (###) for sub-sections. Bold UI elements.

**Constraint:**
- You MUST use ALL ${frames.length} images provided. Every single one must appear in the final blog post.
- Do not skip any images. The reader needs to see every visual step to fully understand the process.
- Do not invent steps that are not visually implied.
`;

  const imageParts = frames.map((frame) => {
    const base64Data = frame.dataUrl.split(',')[1];
    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data
      }
    };
  });

  const promptText = {
    text: `Here are ${frames.length} sequential screenshots from a video tutorial. Please write the blog post following the system instructions. IMPORTANT: You MUST include ALL ${frames.length} screenshots in the blog post using placeholders [[IMAGE_0]] through [[IMAGE_${frames.length - 1}]]. Every single screenshot must be used to give the reader complete visual context of the entire process.`
  };

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [...imageParts, promptText]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: (config.tone === 'enthusiastic' || config.tone === 'casual') ? 0.7 : 0.4,
      }
    });

    return response.text || "No content generated.";
  });
};
