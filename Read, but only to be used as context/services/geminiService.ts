import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ProcessedFrame, BlogConfiguration, VideoSegment } from "../types";

// --- Blog Generation ---

export const generateBlogPostFromFrames = async (
  frames: ProcessedFrame[],
  config: BlogConfiguration
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const lengthInstruction = {
    short: "Keep the blog post concise, roughly 400-600 words. Focus on the core steps.",
    medium: "Write a balanced blog post, roughly 800-1200 words. Provide good detail for each step.",
    long: "Write an in-depth, comprehensive guide, roughly 1500+ words. Elaborate on every detail, add tips, context, and troubleshooting.",
  }[config.length];

  const toneInstruction = `Adopt a ${config.tone} tone.`;
  const audienceInstruction = `Target audience: ${config.targetAudience}. Adjust vocabulary and complexity accordingly.`;
  const conclusionInstruction = config.includeConclusion ? "Include a summarizing conclusion at the end." : "Do not include a formal conclusion.";

  const SYSTEM_INSTRUCTION = `
You are an expert technical content writer and instructional designer. 
Your goal is to transform a visual sequence of steps from a video tutorial into a high-quality, engaging blog post.

**Input:**
You will receive a sequence of images (frames) extracted from a video tutorial. 
NOTE: You may receive many images (e.g., 20+). MANY will be redundant or transitional.

**Configuration Parameters:**
1.  **Length:** ${lengthInstruction}
2.  **Tone:** ${toneInstruction}
3.  **Audience:** ${audienceInstruction}
4.  **Structure:** ${conclusionInstruction}

**Output Requirements:**
1.  **Title:** Create a catchy, SEO-friendly title for the tutorial.
2.  **Introduction:** Write a brief introduction explaining what the tutorial covers and why it is useful.
3.  **Step-by-Step Instructions:** Break down the process into clear, numbered steps. 
4.  **Visual Illustration (CRITICAL):** 
    - You must select the *single best image* that clearly illustrates a specific step.
    - **Aggressively filter the images.** Do NOT use blurry, transitional, or repetitive images. Only use the ones that are perfect screenshots of a UI state or action.
    - When you describe a step that corresponds to a good image, insert a placeholder tag: \`[[IMAGE_index]]\`.
    - \`index\` corresponds to the order of the image provided (0 to ${frames.length - 1}).
    - **IMPORTANT:** Do NOT wrap the placeholder in Markdown image syntax. Just write \`[[IMAGE_index]]\` on its own line.
5.  **Formatting:** Use standard Markdown. H2 (##) for main sections, H3 (###) for sub-sections. Bold UI elements.

**Constraint:**
- Only use images provided.
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
    text: `Here are ${frames.length} sequential screenshots from a video tutorial. Please write the blog post following the system instructions.`
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [...imageParts, promptText] 
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: (config.tone === 'enthusiastic' || config.tone === 'casual') ? 0.7 : 0.4, 
      }
    });

    return response.text || "No content generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate blog post. Please check your API key and try again.");
  }
};

// --- Video Script Generation ---

export const generateVideoScript = async (
  blogContent: string,
  frameCount: number
): Promise<VideoSegment[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const SYSTEM_INSTRUCTION = `
    You are a video producer. Your task is to convert a blog post tutorial into a voiceover script for a short video.
    
    **Input:**
    - Blog post content.
    - Total available frames: ${frameCount} (indexed 0 to ${frameCount - 1}).

    **Output Rules:**
    1.  Create a JSON array of objects.
    2.  Each object must have:
        - \`text\`: The voiceover text. **CRITICAL: This must be a concise SUMMARY for audio, not the full blog text.** Keep each segment under 2-3 sentences.
        - \`frameIndex\`: The index of the most relevant image to show.
    3.  **IMPORTANT - SEGMENTATION:** 
        - Even though you have ${frameCount} frames, **DO NOT create a segment for every single frame.**
        - Group the narrative into roughly **8 to 12 meaningful segments** to ensure smooth pacing and avoid overwhelming the audio generator.
        - For each segment, pick the *single most relevant frame* from the available pool. You can skip frames that are less important.
    4.  The first segment should be an intro. The last should be an outro.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: blogContent }] },
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        frameIndex: { type: Type.INTEGER }
                    },
                    required: ['text', 'frameIndex']
                }
            }
        }
    });

    let jsonText = response.text || "[]";
    
    // Cleanup: Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
        return JSON.parse(jsonText) as VideoSegment[];
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "Raw Text:", jsonText.substring(0, 500));
        throw new Error("Failed to parse video script JSON. The AI response may have been malformed.");
    }

  } catch (error) {
    console.error("Script Generation Error", error);
    throw new Error("Failed to generate video script.");
  }
};

// --- TTS Audio Generation ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateVoiceover = async (text: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let lastError;
    
    // Retry loop for robustness against 503 Service Unavailable & 429 Rate Limits
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });
            
            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!audioData) throw new Error("No audio data generated");
            return audioData;

        } catch (error: any) {
            console.warn(`TTS Attempt ${attempt} failed:`, error.message);
            lastError = error;
            
            const isRateLimit = error.message?.includes('429') || error.status === 429 || error.message?.includes('quota');
            const isOverloaded = error.message?.includes('503') || error.status === 503;

            if (isRateLimit) {
                // Aggressive backoff for rate limits: 10s, 20s, 30s
                 await delay(10000 * attempt);
            } else if (isOverloaded || attempt < 3) {
                 // Standard backoff
                 await delay(2000 * attempt); 
            } else {
                if (attempt === 3) throw error;
                await delay(2000 * attempt);
            }
        }
    }
    
    throw lastError || new Error("Failed to generate voiceover after retries");
}