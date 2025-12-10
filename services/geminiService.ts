/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { RepoFileTree, Citation, SocialPost, CarouselResult, CarouselSlide, BlogPostResult, BlogVisual } from '../types';
// SocialPost is now used in generateCarousel for multi-platform captions

// Helper to ensure we always get the freshest key from the environment
// immediately before a call.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Jina AI Reader API - fetches clean, LLM-friendly content from URLs
async function fetchBlogContentWithJina(url: string): Promise<string> {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const headers: Record<string, string> = {
        'Accept': 'application/json',
    };

    // Add API key if available for higher rate limits
    if (process.env.JINA_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;
    }

    try {
        const response = await fetch(jinaUrl, { headers });

        if (!response.ok) {
            throw new Error(`Jina Reader API returned status ${response.status}`);
        }

        const data = await response.json();

        // Jina returns { url, title, content, ... }
        // Combine title and content for comprehensive context
        let blogContent = '';
        if (data.title) {
            blogContent += `Title: ${data.title}\n\n`;
        }
        if (data.description) {
            blogContent += `Description: ${data.description}\n\n`;
        }
        if (data.content) {
            blogContent += data.content;
        }

        if (!blogContent.trim()) {
            throw new Error('Jina Reader returned empty content');
        }

        return blogContent;
    } catch (error: any) {
        console.error('Jina Reader API fetch failed:', error);
        throw new Error(`Failed to fetch blog content: ${error.message}`);
    }
}

// Robust retry logic for 503 Service Unavailable / Overloaded errors
async function withRetry<T>(operation: () => Promise<T>, retries = 5, baseDelay = 5000): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      // Check for 503 or "overloaded" message in various formats
      const errorMessage = error.message || error.toString() || '';
      const errorStatus = error.status || error.code || error.httpStatusCode;
      const isOverloaded =
        errorStatus === 503 ||
        errorStatus === '503' ||
        errorMessage.toLowerCase().includes('overloaded') ||
        errorMessage.toLowerCase().includes('503') ||
        errorMessage.toLowerCase().includes('unavailable') ||
        errorMessage.toLowerCase().includes('capacity') ||
        errorMessage.toLowerCase().includes('try again later');

      if (isOverloaded && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i); // Exponential backoff: 5s, 10s, 20s, 40s, 80s
        console.warn(`Gemini Model Overloaded (Attempt ${i + 1}/${retries}). Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Helper to clean JSON string from Markdown code fences
function cleanJsonString(text: string): string {
    let clean = text.trim();
    // Remove markdown code blocks if present
    if (clean.startsWith('```json')) {
        clean = clean.substring(7);
    } else if (clean.startsWith('```')) {
        clean = clean.substring(3);
    }

    if (clean.endsWith('```')) {
        clean = clean.substring(0, clean.length - 3);
    }
    return clean.trim();
}

// Twitter character limit constant
const TWITTER_CHAR_LIMIT = 280;

// Helper to enforce Twitter's 280 character limit
// Intelligently truncates content while preserving hashtags when possible
function enforceTwitterCharLimit(content: string): string {
    if (content.length <= TWITTER_CHAR_LIMIT) {
        return content;
    }

    // Extract hashtags (typically at the end)
    const hashtagRegex = /#\w+/g;
    const allHashtags = content.match(hashtagRegex) || [];

    // Find where the hashtag section starts (consecutive hashtags at the end)
    let hashtagSectionStart = content.length;
    let lastHashtagEndIndex = content.length;

    // Work backwards to find the hashtag section at the end
    const lines = content.split('\n');
    const lastLine = lines[lines.length - 1];
    const hashtagsInLastLine = lastLine.match(hashtagRegex);

    if (hashtagsInLastLine && hashtagsInLastLine.length > 0) {
        // Find where hashtags start in the last line
        const firstHashtagInLastLine = lastLine.indexOf('#');
        if (firstHashtagInLastLine !== -1) {
            // Calculate position in original content
            hashtagSectionStart = content.lastIndexOf(lastLine) + firstHashtagInLastLine;
        }
    }

    // Get main content and hashtag section
    let mainContent = content.substring(0, hashtagSectionStart).trim();
    let hashtagSection = content.substring(hashtagSectionStart).trim();

    // If no clear hashtag section found, extract hashtags differently
    if (!hashtagSection || hashtagSection.length === 0) {
        // Just truncate the whole content
        mainContent = content;
        hashtagSection = '';
    }

    // Calculate space needed for hashtags (keep as many as fit)
    const hashtagsArray = hashtagSection.split(/\s+/).filter(h => h.startsWith('#'));
    let finalHashtags = '';
    let hashtagsToKeep: string[] = [];

    // Calculate minimum space for main content (at least allow some truncation with ellipsis)
    const minMainContentSpace = 50; // Minimum chars for main content
    const ellipsis = '...';

    // Try to fit hashtags, starting from the first one
    for (const hashtag of hashtagsArray) {
        const testHashtags = hashtagsToKeep.length > 0
            ? hashtagsToKeep.join(' ') + ' ' + hashtag
            : hashtag;
        const testFinalHashtags = ' ' + testHashtags;

        // Check if adding this hashtag still leaves room for main content
        if (minMainContentSpace + ellipsis.length + testFinalHashtags.length <= TWITTER_CHAR_LIMIT) {
            hashtagsToKeep.push(hashtag);
        } else {
            break;
        }
    }

    finalHashtags = hashtagsToKeep.length > 0 ? ' ' + hashtagsToKeep.join(' ') : '';

    // Calculate max length for main content
    const maxMainContentLength = TWITTER_CHAR_LIMIT - finalHashtags.length - ellipsis.length;

    // Truncate main content if needed
    if (mainContent.length > maxMainContentLength) {
        // Find a good break point (word boundary, sentence end, etc.)
        let truncatedContent = mainContent.substring(0, maxMainContentLength);

        // Try to break at a sentence boundary first
        const sentenceBreaks = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
        let bestBreakPoint = -1;

        for (const breakChar of sentenceBreaks) {
            const lastBreak = truncatedContent.lastIndexOf(breakChar);
            if (lastBreak > maxMainContentLength * 0.5 && lastBreak > bestBreakPoint) {
                bestBreakPoint = lastBreak + 1; // Include the punctuation
            }
        }

        // If no sentence break found, try word boundary
        if (bestBreakPoint === -1) {
            const lastSpace = truncatedContent.lastIndexOf(' ');
            if (lastSpace > maxMainContentLength * 0.5) {
                bestBreakPoint = lastSpace;
            }
        }

        // Apply the break point
        if (bestBreakPoint > 0) {
            truncatedContent = truncatedContent.substring(0, bestBreakPoint).trim();
        } else {
            truncatedContent = truncatedContent.trim();
        }

        mainContent = truncatedContent + ellipsis;
    }

    return (mainContent + finalHashtags).trim();
}

// Helper to apply Twitter character limit to social posts array
function enforceTwitterLimitOnPosts(posts: SocialPost[]): SocialPost[] {
    return posts.map(post => {
        const platformLower = post.platform.toLowerCase();
        if (platformLower === 'twitter' || platformLower === 'x / twitter' || platformLower === 'x') {
            return {
                ...post,
                content: enforceTwitterCharLimit(post.content)
            };
        }
        return post;
    });
}

export interface InfographicResult {
    imageData: string | null;
    citations: Citation[];
    socialPosts: SocialPost[];
}

export async function generateInfographic(
  repoName: string, 
  fileTree: RepoFileTree[], 
  style: string, 
  is3D: boolean = false,
  language: string = "English"
): Promise<string | null> {
  const ai = getAiClient();
  // Summarize architecture for the image prompt
  const limitedTree = fileTree.slice(0, 150).map(f => f.path).join(', ');
  
  let styleGuidelines = "";
  let dimensionPrompt = "";

  if (is3D) {
      // OVERRIDE standard styles for a specific "Tabletop Model" look
      styleGuidelines = `VISUAL STYLE: Photorealistic Miniature Diorama. The data flow should look like a complex, glowing 3D printed physical model sitting on a dark, reflective executive desk.`;
      dimensionPrompt = `PERSPECTIVE & RENDER: Isometric view with TILT-SHIFT depth of field (blurry foreground/background) to make it look like a small, tangible object on a table. Cinematic volumetric lighting. Highly detailed, 'octane render' style.`;
  } else {
      // Standard 2D styles or Custom
      switch (style) {
          case "Hand-Drawn Blueprint":
              styleGuidelines = `VISUAL STYLE: Technical architectural blueprint. Dark blue background with white/light blue hand-drawn lines. Looks like a sketch on drafting paper.`;
              break;
          case "Corporate Minimal":
              styleGuidelines = `VISUAL STYLE: Clean, corporate, minimalist. White background, lots of whitespace, thin lines, limited color palette (greys, navy blues).`;
              break;
          case "Neon Cyberpunk":
              styleGuidelines = `VISUAL STYLE: Dark mode cyberpunk. Black background with glowing neon pink, cyan, and violet lines and nodes. High contrast, futuristic look.`;
              break;
          case "Modern Data Flow":
              styleGuidelines = `VISUAL STYLE: Replicate "Androidify Data Flow" aesthetic. Light blue (#eef8fe) solid background. Colorful, flat vector icons. Smooth, bright blue curved arrows.`;
              break;
          default:
              // Handle custom style string
              if (style && style !== "Custom") {
                  styleGuidelines = `VISUAL STYLE: ${style}.`;
              } else {
                  styleGuidelines = `VISUAL STYLE: Replicate "Androidify Data Flow" aesthetic. Light blue (#eef8fe) solid background. Colorful, flat vector icons. Smooth, bright blue curved arrows.`;
              }
              break;
      }
      dimensionPrompt = "Perspective: Clean 2D flat diagrammatic view straight-on. No 3D effects.";
  }

  const baseStylePrompt = `
  STRICT VISUAL STYLE GUIDELINES:
  ${styleGuidelines}
  - LAYOUT: Distinct Left-to-Right flow.
  - CENTRAL CONTAINER: Group core logic inside a clearly defined central area.
  - ICONS: Use relevant technical icons (databases, servers, code files, users).
  - TYPOGRAPHY: Highly readable technical font. Text MUST be in ${language}.
  `;

  const prompt = `Create a highly detailed technical logical data flow diagram infographic for GitHub repository : "${repoName}".
  
  ${baseStylePrompt}
  ${dimensionPrompt}
  
  Repository Context: ${limitedTree}...
  
  Diagram Content Requirements:
  1. Title exactly: "${repoName} Data Flow" (Translated to ${language} if not English)
  2. Visually map the likely data flow based on the provided file structure.
  3. Ensure the "Input -> Processing -> Output" structure is clear.
  4. Add short, clear text labels to connecting arrows indicating data type (e.g., "JSON", "Auth Token").
  5. IMPORTANT: All text labels and explanations in the image must be written in ${language}.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    }));

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini infographic generation failed:", error);
    throw error;
  }
}

export async function askRepoQuestion(question: string, infographicBase64: string, fileTree: RepoFileTree[]): Promise<string> {
  const ai = getAiClient();
  // Provide context about the file structure to supplement the image
  const limitedTree = fileTree.slice(0, 300).map(f => f.path).join('\n');
  
  const prompt = `You are a senior software architect reviewing a project.
  
  Attached is an architectural infographic of the project.
  Here is the actual file structure of the repository:
  ${limitedTree}
  
  User Question: "${question}"
  
  Using BOTH the visual infographic and the file structure as context, answer the user's question. 
  If they ask about optimization, suggest specific areas based on the likely bottlenecks visible in standard architectures like this.
  Keep answers concise, technical, and helpful.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
       model: 'gemini-3-pro-preview',
       contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: infographicBase64
            }
          },
          { text: prompt }
        ]
      }
    }));

    return response.text || "I couldn't generate an answer at this time.";
  } catch (error) {
    console.error("Gemini Q&A failed:", error);
    throw error;
  }
}

export async function askNodeSpecificQuestion(
  nodeLabel: string, 
  question: string, 
  fileTree: RepoFileTree[]
): Promise<string> {
  const ai = getAiClient();
  const limitedTree = fileTree.slice(0, 300).map(f => f.path).join('\n');
  
  const prompt = `You are a senior software architect analyzing a repository.
  
  The user is asking about a specific node in the dependency graph labeled: "${nodeLabel}".
  
  Repository File Structure Context (first 300 files):
  ${limitedTree}
  
  User Question: "${question}"
  
  Based on the node name "${nodeLabel}" and the file structure, explain what this component likely does, its responsibilities, and answer the specific question.
  Keep the response technical, concise, and helpful for a developer.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
       model: 'gemini-3-pro-preview',
       contents: {
        parts: [
          { text: prompt }
        ]
      }
    }));

    return response.text || "I couldn't generate an answer at this time.";
  } catch (error) {
    console.error("Gemini Node Q&A failed:", error);
    throw error;
  }
}

export async function generateArticleInfographic(
  input: string,
  inputType: 'url' | 'prompt',
  style: string, 
  platforms: string[],
  onProgress?: (stage: string) => void,
  language: string = "English"
): Promise<InfographicResult> {
    const ai = getAiClient();
    // PHASE 1: Content Understanding & Structural Breakdown (The "Planner")
    if (onProgress) onProgress("ANALYZING & DRAFTING POSTS...");
    
    let structuralSummary = "";
    let citations: Citation[] = [];
    let socialPosts: SocialPost[] = [];

    try {
        let analysisContextPrompt = "";
        if (inputType === 'url') {
            analysisContextPrompt = `Analyze the web page content at: ${input}`;
        } else {
            // For prompt, we treat it as a topic request or raw text to process
            analysisContextPrompt = `Research and analyze the following topic or text content: "${input}". Use Google Search to find relevant, up-to-date information if it is a topic.`;
        }

        const analysisPrompt = `You are an expert Social Media Strategist and Information Designer. 
        
        Your goal is to:
        1. ${analysisContextPrompt}
        2. Create a structured plan for an infographic summarizing the content.
        3. Draft engaging social media posts for the following platforms: ${platforms.length > 0 ? platforms.join(', ') : 'LinkedIn, Twitter'}.

        TARGET LANGUAGE: ${language}.
        
        OUTPUT FORMAT:
        Provide the response in two sections separated by the delimiter "|||SOCIAL_POSTS|||".

        SECTION 1: INFOGRAPHIC PLAN
        Provide a structured breakdown specifically designed for visual representation in ${language}:
        - INFOGRAPHIC HEADLINE: The core topic in 5 words or less.
        - KEY TAKEAWAYS: The 3 to 5 most important distinct points, steps, or facts. THESE WILL BE THE MAIN SECTIONS OF THE IMAGE.
        - SUPPORTING DATA: Any specific numbers, percentages, or very short quotes that add credibility.
        - VISUAL METAPHOR IDEA: Suggest ONE simple visual concept that best fits this content.

        |||SOCIAL_POSTS|||
        
        SECTION 2: SOCIAL MEDIA POSTS
        Provide a valid JSON array containing the drafts. Do not use Markdown formatting for the JSON.
        Format: [ { "platform": "Platform Name", "content": "Engaging post content including hashtags..." }, ... ]
        `;

        // Switch to 'gemini-3-pro-image-preview' for research phase to allow search tool.
        const analysisResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: analysisPrompt,
            config: {
                tools: [{ googleSearch: {} }],
                // Do NOT set responseMimeType when using tools
            }
        }));
        
        const fullText = analysisResponse.text || "";
        const splitText = fullText.split("|||SOCIAL_POSTS|||");
        
        structuralSummary = splitText[0].trim();
        
        if (splitText.length > 1) {
            try {
                let jsonStr = splitText[1].trim();
                jsonStr = cleanJsonString(jsonStr);
                socialPosts = JSON.parse(jsonStr);
            } catch (e) {
                console.warn("Failed to parse social posts JSON", e);
                // Fallback if parsing fails - just provide a generic error post
                socialPosts = platforms.map(p => ({ platform: p, content: "Could not parse generated content." }));
            }
        }

        // Extract citations from grounding metadata with Titles
        const chunks = analysisResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            chunks.forEach((chunk: any) => {
                if (chunk.web?.uri) {
                    citations.push({
                        uri: chunk.web.uri,
                        title: chunk.web.title || "" 
                    });
                }
            });
            const uniqueCitations = new Map();
            citations.forEach(c => uniqueCitations.set(c.uri, c));
            citations = Array.from(uniqueCitations.values());
        }

    } catch (e) {
        console.warn("Content analysis failed, falling back to direct prompt", e);
        structuralSummary = `Create an infographic about: ${input}. Translate text to ${language}.`;
        socialPosts = platforms.map(p => ({ platform: p, content: `Check out this content: ${input}` }));
    }

    // PHASE 2: Visual Synthesis (The "Artist")
    if (onProgress) onProgress("DESIGNING & RENDERING VISUALS...");

    let styleGuidelines = "";
    switch (style) {
        case "Fun & Playful":
            styleGuidelines = `STYLE: Fun, playful, vibrant 2D vector illustrations. Use bright colors, rounded shapes, and a friendly tone.`;
            break;
        case "Clean Minimalist":
            styleGuidelines = `STYLE: Ultra-minimalist. Lots of whitespace, thin lines, limited color palette (1-2 accent colors max). Very sophisticated and airy.`;
            break;
        case "Dark Mode Tech":
            styleGuidelines = `STYLE: Dark mode technical aesthetic. Dark slate/black background with bright, glowing accent colors (cyan, lime green) for data points.`;
            break;
        case "Modern Editorial":
            styleGuidelines = `STYLE: Modern, flat vector illustration style. Clean, professional, and editorial (like a high-end tech magazine). Cohesive, mature color palette.`;
            break;
        default:
            // Custom style logic
             if (style && style !== "Custom") {
                styleGuidelines = `STYLE: Custom User Style: "${style}".`;
             } else {
                styleGuidelines = `STYLE: Modern, flat vector illustration style. Clean, professional, and editorial (like a high-end tech magazine). Cohesive, mature color palette.`;
             }
            break;
    }

    const imagePrompt = `Create a professional, high-quality educational infographic based strictly on this structured content plan:

    ${structuralSummary}

    VISUAL DESIGN RULES:
    - ${styleGuidelines}
    - LANGUAGE: The text within the infographic MUST be written in ${language}.
    - LAYOUT: MUST follow the "VISUAL METAPHOR IDEA" from the plan above if one was provided.
    - TYPOGRAPHY: Clean, highly readable sans-serif fonts. The "INFOGRAPHIC HEADLINE" must be prominent at the top.
    - CONTENT: Use the actual text from "KEY TAKEAWAYS" in the image. Do not use placeholder text like Lorem Ipsum.
    - GOAL: The image must be informative and readable as a standalone graphic.
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [{ text: imagePrompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        }));

        let imageData = null;
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                    imageData = part.inlineData.data;
                    break;
                }
            }
        }
        // Enforce Twitter 280 character limit on all Twitter posts
        const enforcedPosts = enforceTwitterLimitOnPosts(socialPosts);
        return { imageData, citations, socialPosts: enforcedPosts };
    } catch (error) {
        console.error("Article infographic generation failed:", error);
        throw error;
    }
}

export async function editImageWithGemini(base64Data: string, mimeType: string, prompt: string): Promise<string | null> {
  const ai = getAiClient();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    }));

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini image editing failed:", error);
    throw error;
  }
}

export async function generateCarousel(
    url: string,
    prompt: string,
    sourceImage: string | null,
    style: string,
    language: string,
    platforms: string[] = ['LinkedIn', 'X / Twitter', 'Instagram'],
    onProgress: (stage: string) => void
): Promise<CarouselResult> {
    const ai = getAiClient();

    // Step 1: Plan the Carousel with multi-platform captions
    onProgress('PLANNING NARRATIVE ARC...');

    const parts: any[] = [];

    // Add Source Image if provided
    if (sourceImage) {
        parts.push({
            inlineData: {
                data: sourceImage,
                mimeType: "image/png" // Assuming standard format from frontend
            }
        });
    }

    let contextInstruction = "";
    if (url) {
        contextInstruction += `Primary Source Content: ${url} (Use Google Search to analyze this link).\n`;
    }
    if (prompt) {
        contextInstruction += `User Instructions / Specific Context: "${prompt}"\n`;
    }

    // Platform-specific character limits for captions
    const platformLimits: Record<string, { charLimit: number; hashtagLimit: number }> = {
        'X / Twitter': { charLimit: 280, hashtagLimit: 3 },
        'Twitter': { charLimit: 280, hashtagLimit: 3 },
        'LinkedIn': { charLimit: 3000, hashtagLimit: 5 },
        'Instagram': { charLimit: 2200, hashtagLimit: 30 },
    };

    const platformInstructions = platforms.map(p => {
        const limits = platformLimits[p] || { charLimit: 2000, hashtagLimit: 5 };
        return `- ${p}: Max ${limits.charLimit} characters, ${limits.hashtagLimit} hashtags`;
    }).join('\n');

    const planPrompt = `
    ${contextInstruction}

    Create a plan for a 4-slide social media carousel.
    TARGET LANGUAGE: ${language}.
    TARGET PLATFORMS: ${platforms.join(', ')}

    Return a valid JSON object with the following structure:
    {
      "captions": [
        ${platforms.map(p => `{ "platform": "${p}", "content": "Optimized caption for ${p} with appropriate hashtags..." }`).join(',\n        ')}
      ],
      "slides": [
        {
          "order": 1,
          "title": "Hook / Title Slide",
          "content": "Short, punchy subtitle or hook text.",
          "visual_metaphor": "Description of visual for slide 1. IF AN IMAGE WAS PROVIDED, USE IT AS REFERENCE OR SUBJECT."
        },
        {
          "order": 2,
          "title": "Key Point 1",
          "content": "Concise explanation (max 15 words).",
          "visual_metaphor": "Description of visual for slide 2"
        },
        {
          "order": 3,
          "title": "Key Point 2",
          "content": "Concise explanation (max 15 words).",
          "visual_metaphor": "Description of visual for slide 3"
        },
        {
          "order": 4,
          "title": "Summary / CTA",
          "content": "Final takeaway.",
          "visual_metaphor": "Description of visual for slide 4"
        }
      ]
    }

    CAPTION REQUIREMENTS FOR EACH PLATFORM:
    ${platformInstructions}

    Each caption should be optimized for its platform:
    - X / Twitter: Concise, punchy, trending hashtags, compelling hook
    - LinkedIn: Professional tone, industry insights, thought leadership
    - Instagram: Visual-first language, emojis allowed, engaging CTA
    `;

    parts.push({ text: planPrompt });

    let plan: any = {};
    try {
        const planResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }],
            }
        }));

        let jsonStr = planResponse.text || "{}";
        jsonStr = cleanJsonString(jsonStr);
        plan = JSON.parse(jsonStr);

        if (!plan.slides || plan.slides.length === 0) throw new Error("Failed to generate plan");

    } catch (e) {
        console.error("Planning failed", e);
        throw new Error("Could not plan carousel content from inputs. " + (e as Error).message);
    }

    // Step 2: Generate Images for each slide
    onProgress('RENDERING SLIDES (1/4)...');

    const slides: CarouselSlide[] = [];
    const totalSlides = plan.slides.length;

    // Define style once for consistency
    const visualStyle = style === 'Corporate'
        ? "Modern Corporate Aesthetic. Dark Navy Blue background, white bold Sans-Serif typography, minimal geometric accents. Professional, trusted look."
        : style === 'Bold'
        ? "High Contrast Bold Aesthetic. Bright Yellow background with heavy Black typography. Brutalist design elements. Attention grabbing."
        : "Clean Minimalist Aesthetic. White background, lots of negative space, elegant serif typography, soft pastel accents.";

    // Process slides sequentially to update progress accurately and avoid rate limits on image model
    for (let i = 0; i < totalSlides; i++) {
        const s = plan.slides[i];
        onProgress(`RENDERING SLIDES (${i + 1}/${totalSlides})...`);

        const slidePrompt = `
        Create a ${i === 0 ? "Title Slide" : "Content Slide"} for a social media carousel (Aspect Ratio 3:4).

        TEXT CONTENT TO INCLUDE IN IMAGE (Must be legible):
        - HEADLINE: "${s.title}"
        - BODY: "${s.content}"

        VISUAL STYLE:
        ${visualStyle}

        SCENE DESCRIPTION:
        ${s.visual_metaphor}

        LANGUAGE: ${language}
        `;

        try {
            const imgResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: { parts: [{ text: slidePrompt }] },
                config: {
                    responseModalities: [Modality.IMAGE],
                    imageConfig: {
                        aspectRatio: "3:4" // Portrait for mobile carousels
                    }
                }
            }));

            let imgData = null;
            if (imgResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
                imgData = imgResponse.candidates[0].content.parts[0].inlineData.data;
            }

            slides.push({
                order: s.order,
                title: s.title,
                content: s.content,
                imageData: imgData
            });

        } catch (e) {
            console.warn(`Failed to generate slide ${i+1}`, e);
            // Push placeholder or error slide? We'll just skip the image but keep data
            slides.push({
                order: s.order,
                title: s.title,
                content: s.content,
                imageData: null
            });
        }
    }

    // Extract captions - support both new multi-platform format and legacy single caption
    const captions: SocialPost[] = plan.captions || [];

    // Enforce Twitter 280 character limit on all Twitter posts
    const enforcedCaptions = enforceTwitterLimitOnPosts(captions);

    const legacyCaption = plan.caption || (enforcedCaptions.length > 0 ? enforcedCaptions[0].content : "Check out this new carousel!");

    return {
        slides,
        caption: legacyCaption,
        captions: enforcedCaptions
    };
}

// Updated Blog Generation to include length, instructions, and inline images
export async function generateBlogFromArticle(
    source: { type: 'url' | 'text' | 'topic', content: string },
    instructions: string,
    length: 'Short' | 'Medium' | 'Long' | 'Extensive',
    imageCount: number,
    visualStyle: string,
    language: string,
    onProgress: (stage: string) => void
): Promise<BlogPostResult> {
    const ai = getAiClient();

    // Step 1: Fetch content (for URLs) and Analyze
    onProgress("RESEARCHING & ANALYZING...");

    // Map length to word count approx
    const wordCount = length === 'Short' ? '500'
        : length === 'Medium' ? '1000'
        : length === 'Long' ? '2000'
        : '3000';

    // For URL sources, fetch content using Jina AI Reader API
    let fetchedUrlContent = "";
    if (source.type === 'url') {
        onProgress("FETCHING ARTICLE CONTENT...");
        try {
            fetchedUrlContent = await fetchBlogContentWithJina(source.content);
            // Truncate if too long to fit in context (keep first 15000 chars)
            if (fetchedUrlContent.length > 15000) {
                fetchedUrlContent = fetchedUrlContent.substring(0, 15000) + "\n\n[Content truncated...]";
            }
        } catch (error: any) {
            console.error("Jina fetch failed, will use Google Search fallback:", error);
            // Set to empty to trigger fallback behavior
            fetchedUrlContent = "";
        }
        onProgress("WRITING BLOG POST...");
    }

    let contextPrompt = "";
    let useGoogleSearch = false;

    if (source.type === 'url') {
        if (fetchedUrlContent) {
            // Use the fetched content from Jina AI
            contextPrompt = `1. Analyze the following article content (fetched from ${source.content}):\n\n---BEGIN ARTICLE---\n${fetchedUrlContent}\n---END ARTICLE---`;
        } else {
            // Fallback to Google Search if Jina fetch failed
            contextPrompt = `1. Access and analyze the content of this article: ${source.content} using Google Search.`;
            useGoogleSearch = true;
        }
    } else if (source.type === 'text') {
        contextPrompt = `1. Analyze the following provided research/text document as the primary source material:\n"${source.content.substring(0, 8000)}..."`;
    } else {
        contextPrompt = `1. Research the topic "${source.content}" using Google Search to ensure up-to-date and accurate information.`;
        useGoogleSearch = true;
    }

    const writingPrompt = `
    You are an expert technical writer and professional blogger who creates visually stunning, highly polished blog posts for major tech publications.

    Your task:
    ${contextPrompt}

    2. USER INSTRUCTIONS: "${instructions}"

    3. Write a COMPLETELY NEW, ORIGINAL blog post.
       - ${source.type === 'url' ? "Do NOT just summarize the existing article. Add a fresh perspective." : "Create a comprehensive post based on the findings."}
       - The tone should be engaging, professional, and visually varied.
       - APPROXIMATE LENGTH: ${wordCount} words.

    ===== PROFESSIONAL STYLING REQUIREMENTS (CRITICAL - FOLLOW EXACTLY) =====

    **HEADER HIERARCHY:**
    - Use ## for NUMBERED major section titles (e.g., "## 2. Chat with Gemini Live on the go", "## 3. Use Nano Banana Pro for creative pics")
    - Use ### for subsection titles and feature callouts
    - Section numbers create scannable, organized content structure

    **HYPERLINKS (BLUE TEXT):**
    - Include [linked text](url) markdown hyperlinks throughout the content
    - Link product names, feature names, and technical terms to relevant documentation or pages
    - Example: "open up [Gemini Live](https://gemini.google.com) in the Gemini app"
    - Example: "Thanks to its [camera and screen sharing](https://support.google.com) capabilities"
    - Links appear as blue clickable text - use them liberally for important terms

    **BOLD TEXT FOR EMPHASIS:**
    - Use **bold text** for:
      - Category labels that start bullet points (e.g., "**Consumers and students:** Rolling out globally...")
      - Feature names within sentences (e.g., "With **Gemini 3's advanced reasoning**, Nano Banana Pro doesn't just...")
      - Key phrases that need emphasis (e.g., "**Generate more accurate, context-rich visuals** based on enhanced reasoning")

    **HIGHLIGHTED TERMINOLOGY:**
    - Use <span class="blue">text</span> for key concepts, terminology, or important phrases that should stand out in BLUE but are NOT links
    - Use this sparingly for maximum impact on truly important terms

    **BULLETED LISTS:**
    - Use bulleted lists (-) for:
      - Feature breakdowns by audience (Consumers, Professionals, Developers, Creatives)
      - Step-by-step instructions
      - Key benefits or capabilities
    - Each bullet should start with a **bold label** when categorizing different audiences or features

    **PARAGRAPH STRUCTURE:**
    - Short, scannable paragraphs (2-4 sentences max)
    - Clear topic sentences that introduce each paragraph's main point
    - Generous spacing between sections for readability

    4. VISUAL PLACEMENT AND CAPTIONS:
       - You must generate ${imageCount} DISTINCT visual concepts to accompany the post.
       - The first visual will be the Header Image.
       - For the remaining ${Math.max(0, imageCount - 1)} visuals, you MUST insert a placeholder marker EXACTLY like this: [[IMAGE_X]] (where X is the number, e.g., [[IMAGE_1]], [[IMAGE_2]]) directly into the markdown text flow where the image should visually appear.
       - Place images AFTER relevant paragraphs that describe or introduce the visual concept
       - When multiple images relate to the same topic, group them together for carousel display

    **IMAGE CAPTION STYLE:**
    - Each image MUST have a descriptive caption that appears in light gray below the image
    - Captions can be either:
      a) A description of what the image shows (e.g., "An infographic of the common house plant, String of Turtles, with information on origins, care essentials and growth patterns.")
      b) The prompt used to create the image when relevant (e.g., 'Prompt: Create an infographic about this plant focusing on interesting information.')
      c) A contextual explanation (e.g., "Nano Banana Pro can help you (and your guests) get in the holiday party spirit with visuals for party invitations and reminders with a prompt like 'Create a claymation scene showing a dog dressed up like an elf in a winter wonderland.'")
    - Captions should be 1-2 sentences, informative, and add value beyond the image

    The blog post must be written in ${language}.
    The visual prompts must be in English.

    RETURN FORMAT:
    Use strict delimiters.

    |||TITLE|||
    (Insert Main Title Here - compelling and descriptive)
    |||SUBTITLE|||
    (Insert a short, engaging subtitle that expands on the title)
    |||METADATA|||
    (Insert "Author Name | Date | Category")
    |||CONTENT|||
    (Insert Full Markdown Content Here, starting with Introduction, and including [[IMAGE_X]] markers within the body. Do not repeat Title/Subtitle. Follow ALL styling requirements above meticulously.)

    |||VISUALS|||
    (List the ${imageCount} visual prompts strictly in this format - captions should be detailed and contextual:)
    1. PROMPT: [Detailed prompt for image generation] || CAPTION: [Detailed contextual caption - either describing the image, explaining its relevance to the content, or including the prompt in a narrative way]
    2. PROMPT: [Detailed prompt for image generation] || CAPTION: [Detailed contextual caption]
    ...
    `;

    let visuals: BlogVisual[] = [];
    let content = "";
    let title = "Generated Blog Post";
    let subtitle = "";
    let metadata = "AI Writer | Today | Tech";
    
    try {
        // Only use Google Search tool for topic research or when Jina fetch failed
        const config: any = {};
        if (useGoogleSearch) {
            config.tools = [{ googleSearch: {} }];
        }

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: writingPrompt,
            config: config
        }));
        
        const fullText = response.text || "";
        
        // Parse delimiters
        if (fullText.includes("|||CONTENT|||")) {
             // Basic parsing logic with fallback
             const parts = fullText.split("|||VISUALS|||");
             const mainBody = parts[0];
             const visualPart = parts[1] ? parts[1].trim() : "";
             
             // Extract metadata fields
             const titlePart = mainBody.split("|||TITLE|||")[1]?.split("|||SUBTITLE|||")[0]?.trim();
             const subtitlePart = mainBody.split("|||SUBTITLE|||")[1]?.split("|||METADATA|||")[0]?.trim();
             const metaPart = mainBody.split("|||METADATA|||")[1]?.split("|||CONTENT|||")[0]?.trim();
             const contentPart = mainBody.split("|||CONTENT|||")[1]?.trim();
             
             if (titlePart) title = titlePart;
             if (subtitlePart) subtitle = subtitlePart;
             if (metaPart) metadata = metaPart;
             if (contentPart) content = contentPart;
             
             // Parse Visuals
             const visualLines = visualPart.split('\n').filter(l => l.includes("PROMPT:") && l.includes("CAPTION:"));
             visuals = visualLines.map((line, idx) => {
                 try {
                     // Regex to extract prompt and caption
                     const promptMatch = line.match(/PROMPT:\s*(.*?)\s*\|\|\s*CAPTION:\s*(.*)/);
                     if (promptMatch) {
                         return {
                             id: idx === 0 ? "header" : `image_${idx}`, // Header is 0, rest map to placeholders
                             prompt: promptMatch[1],
                             caption: promptMatch[2],
                             imageData: null,
                             status: 'pending' as const
                         };
                     }
                     return null;
                 } catch (e) { return null; }
             }).filter(v => v !== null) as BlogVisual[];
        } else {
             // Fallback
             console.warn("Delimiters failed, using raw text");
             content = fullText;
             // Try to construct at least one visual placeholder if failed
             visuals = [{ id: "header", prompt: "A header image related to " + source.content, caption: "Header", imageData: null, status: 'pending' as const }];
        }

        if (!content) throw new Error("Failed to parse content from model output.");

    } catch (e) {
        console.error("Blog generation failed", e);
        throw new Error("Could not analyze source or generate text. " + (e as Error).message);
    }

    // Step 2: Generate Visuals in Parallel
    if (visuals.length > 0) {
        onProgress(`GENERATING ${visuals.length} VISUALS...`);
        
        const imagePromises = visuals.map(async (vis, idx): Promise<BlogVisual> => {
             const isHeader = idx === 0;
             const aspectRatio = isHeader ? "16:9" : "4:3";
             
             const finalImagePrompt = `
             Create a high-quality ${isHeader ? "header image" : "editorial illustration"} for a blog post.
             
             SUBJECT: ${vis.prompt}
             
             STYLE: ${visualStyle === 'Photorealistic' ? 'Cinematic, Photorealistic, 4k, High Detail' : visualStyle === 'Graphic Novel' ? 'Comic Book Style, Graphic Novel, Vibrant, Ink Lines' : visualStyle}
             `;

             try {
                const imgResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
                    model: 'gemini-3-pro-image-preview',
                    contents: { parts: [{ text: finalImagePrompt }] },
                    config: {
                        responseModalities: [Modality.IMAGE],
                        imageConfig: {
                            aspectRatio: aspectRatio
                        }
                    }
                }));

                if (imgResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
                    return {
                        ...vis,
                        imageData: imgResponse.candidates[0].content.parts[0].inlineData.data,
                        status: 'complete'
                    };
                }
             } catch (e) {
                console.warn(`Image generation failed for visual ${idx}`, e);
                return { ...vis, status: 'error' };
             }
             return { ...vis, status: 'complete' };
        });

        visuals = await Promise.all(imagePromises);
    }

    return {
        title: title,
        subtitle: subtitle,
        metadata: metadata,
        content: content,
        visuals: visuals
    };
}

// Function to regenerate a specific blog visual
export async function regenerateBlogVisual(
    visual: BlogVisual, 
    visualStyle: string
): Promise<string | null> {
    const ai = getAiClient();
    const isHeader = visual.id === 'header';
    const aspectRatio = isHeader ? "16:9" : "4:3";

    const finalImagePrompt = `
    Create a high-quality ${isHeader ? "header image" : "editorial illustration"} for a blog post.
    
    SUBJECT: ${visual.prompt}
    
    STYLE: ${visualStyle === 'Photorealistic' ? 'Cinematic, Photorealistic, 4k, High Detail' : visualStyle === 'Graphic Novel' ? 'Comic Book Style, Graphic Novel, Vibrant, Ink Lines' : visualStyle}
    `;

    try {
        const imgResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ text: finalImagePrompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
                imageConfig: {
                    aspectRatio: aspectRatio
                }
            }
        }));

        if (imgResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            return imgResponse.candidates[0].content.parts[0].inlineData.data;
        }
    } catch (e) {
        console.error("Single visual regeneration failed", e);
    }
    return null;
}

export async function generateBlogFromVideo(
    videoUrl: string,
    visualStyle: string,
    language: string,
    onProgress: (stage: string) => void
): Promise<BlogPostResult> {
    const ai = getAiClient();
    
    // Step 1: Analyze and Write
    onProgress("ANALYZING VIDEO CONTENT...");
    
    const writingPrompt = `
    You are an expert content creator and technical writer who creates visually stunning, highly polished blog posts for major tech publications.

    Your task:
    1. Access and analyze the content of this YouTube video: ${videoUrl} using Google Search tools to find transcripts, summaries, or descriptions.
    2. Understand the core topic, key takeaways, and speaker's perspective.
    3. Write a COMPLETELY NEW, COMPREHENSIVE blog post based on the video content.
       - The tone should be engaging and educational.
    4. Create a prompt for a header image that visually represents the core topic.

    ===== PROFESSIONAL STYLING REQUIREMENTS (CRITICAL - FOLLOW EXACTLY) =====

    **HEADER HIERARCHY:**
    - Use ## for NUMBERED major section titles (e.g., "## 1. Key Insights from the Video", "## 2. Deep Dive into the Technology")
    - Use ### for subsection titles and feature callouts
    - Section numbers create scannable, organized content structure

    **HYPERLINKS (BLUE TEXT):**
    - Include [linked text](url) markdown hyperlinks throughout the content
    - Link product names, feature names, and technical terms to relevant documentation or pages
    - Example: "The speaker discusses [TensorFlow](https://tensorflow.org) and its capabilities"
    - Links appear as blue clickable text - use them liberally for important terms

    **BOLD TEXT FOR EMPHASIS:**
    - Use **bold text** for:
      - Category labels that start bullet points (e.g., "**Key Takeaway:** The most important insight...")
      - Feature names within sentences (e.g., "With **advanced machine learning**, the system can...")
      - Key phrases that need emphasis

    **HIGHLIGHTED TERMINOLOGY:**
    - Use <span class="blue">text</span> for key concepts, terminology, or important phrases that should stand out in BLUE but are NOT links
    - Use this sparingly for maximum impact on truly important terms

    **BULLETED LISTS:**
    - Use bulleted lists (-) for:
      - Key takeaways and insights
      - Step-by-step breakdowns
      - Feature highlights
    - Each bullet should start with a **bold label** when categorizing different points

    **PARAGRAPH STRUCTURE:**
    - Short, scannable paragraphs (2-4 sentences max)
    - Clear topic sentences that introduce each paragraph's main point
    - Generous spacing between sections for readability

    The blog post must be written in ${language}.
    The image prompt must be in English.

    RETURN FORMAT:
    Do NOT use JSON. Use the following strict delimiters to separate the sections:

    |||TITLE|||
    (Insert compelling, descriptive Title Here)
    |||SUBTITLE|||
    (Insert engaging Subtitle that expands on the title)
    |||METADATA|||
    (Insert Author | Date | Category)
    |||IMAGE_PROMPT|||
    (Insert detailed Image Prompt Here for a visually striking header image)
    |||CONTENT|||
    (Insert Full Markdown Content Here - follow ALL styling requirements above meticulously)
    `;

    let result = { title: "", subtitle: "", metadata: "", content: "", image_prompt: "" };
    
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview', 
            contents: writingPrompt,
            config: {
                tools: [{ googleSearch: {} }],
                // Removed responseMimeType to comply with googleSearch tool rules
            }
        }));
        
        const fullText = response.text || "";
        
        // Parse delimiters
        if (fullText.includes("|||CONTENT|||")) {
             // Robust extraction logic
             const getPart = (start: string, end: string) => fullText.split(start)[1]?.split(end)[0]?.trim() || "";
             
             result.title = getPart("|||TITLE|||", "|||SUBTITLE|||") || "Video Blog";
             result.subtitle = getPart("|||SUBTITLE|||", "|||METADATA|||");
             result.metadata = getPart("|||METADATA|||", "|||IMAGE_PROMPT|||");
             result.image_prompt = getPart("|||IMAGE_PROMPT|||", "|||CONTENT|||");
             result.content = fullText.split("|||CONTENT|||")[1]?.trim() || "";
        } else {
             // Fallback attempt
             console.warn("Delimiters failed in video blog generation");
             result.content = fullText;
             result.title = "Video Analysis";
        }
        
        if (!result.content) throw new Error("Failed to parse content from model output.");

    } catch (e) {
        console.error("Video blog generation failed", e);
        throw new Error("Could not analyze video or generate text. " + (e as Error).message);
    }

    // Step 2: Generate Visual
    onProgress("CREATING HEADER IMAGE...");
    let imageData = null;

    if (result.image_prompt) {
        const finalImagePrompt = `
        Create a high-quality blog header image (16:9).
        
        SUBJECT: ${result.image_prompt}
        
        STYLE: ${visualStyle === 'Photorealistic' ? 'Cinematic, Photorealistic, 4k, High Detail' : 'Modern Digital Art, Vector Illustration, Clean, Vibrant, Abstract, Tech'}
        `;

        try {
            const imgResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: { parts: [{ text: finalImagePrompt }] },
                config: {
                    responseModalities: [Modality.IMAGE],
                    imageConfig: {
                        aspectRatio: "16:9"
                    }
                }
            }));

            if (imgResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
                imageData = imgResponse.candidates[0].content.parts[0].inlineData.data;
            }
        } catch (e) {
            console.warn("Image generation failed", e);
        }
    }

    // Adapt to new visual structure
    const visual: BlogVisual = {
        id: "header",
        prompt: result.image_prompt,
        caption: "Header Image",
        imageData: imageData,
        status: imageData ? 'complete' : 'error'
    };

    return {
        title: result.title,
        subtitle: result.subtitle,
        metadata: result.metadata,
        content: result.content,
        visuals: [visual]
    };
}

export async function generateYouTubeThumbnail(
    topic: string,
    style: string,
    emotion: string,
    textOverlay: string,
    useSearch: boolean,
    sourceImage: string | null,
    onProgress: (stage: string) => void
): Promise<string | null> {
    const ai = getAiClient();
    
    let viralInsight = "";

    // Step 1: Research (Optional)
    if (useSearch) {
        onProgress("RESEARCHING VIRAL TRENDS...");
        try {
            const searchPrompt = `
            Analyze current high-performing YouTube thumbnails for the topic: "${topic}".
            Find specific visual trends, colors, layouts, and composition styles that are getting high Click-Through Rates (CTR) right now.
            Return a concise visual description (max 3 sentences) of a winning thumbnail concept.
            `;
            
            const searchResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: searchPrompt,
                config: { tools: [{ googleSearch: {} }] }
            }));
            viralInsight = searchResponse.text || "";
        } catch (e) {
            console.warn("Trend research failed, skipping.", e);
        }
    }

    // Step 2: Generate/Edit Thumbnail
    onProgress(sourceImage ? "COMPOSITING THUMBNAIL..." : "GENERATING THUMBNAIL...");

    const parts: any[] = [];
    if (sourceImage) {
        parts.push({
            inlineData: {
                data: sourceImage,
                mimeType: "image/png" // Assuming PNG/JPEG from input
            }
        });
    }

    const basePrompt = `
    Create a VIRAL YouTube Thumbnail (16:9 aspect ratio).
    
    CORE TOPIC: ${topic}
    VISUAL STYLE: ${style}
    ${emotion ? `SUBJECT EMOTION: ${emotion}` : ''}
    ${textOverlay ? `TEXT OVERLAY (MUST BE HUGE & LEGIBLE): "${textOverlay}"` : ''}
    
    ${viralInsight ? `TREND INSIGHT (INCORPORATE THIS): ${viralInsight}` : ''}
    
    DESIGN RULES FOR HIGH CTR:
    - High Saturation and Contrast.
    - Expressive, exaggerated facial features (if a person is present).
    - Clear, bold text overlay (max 3-4 words).
    - Rule of Thirds composition.
    - If a source image is provided, seamlessly composite the person into the scene with the requested emotion/style.
    `;

    parts.push({ text: basePrompt });

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
                imageConfig: {
                    aspectRatio: "16:9"
                }
            }
        }));

        if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            return response.candidates[0].content.parts[0].inlineData.data;
        }
        return null;
    } catch (e) {
        console.error("Thumbnail generation failed", e);
        throw e;
    }
}

export async function enhanceVideoPrompt(prompt: string, style: string): Promise<string> {
    const ai = getAiClient();
    const systemPrompt = `You are a professional Video Director and Cinematographer.
    Your task is to take a simple user idea and rewrite it into a highly detailed, cinematic video generation prompt for an AI video model.
    
    User Idea: "${prompt}"
    Target Style: "${style}"
    
    Requirements:
    - Describe the lighting, camera movement, depth of field, color grading, and subject action in detail.
    - Make it sound like a high-end stock footage description.
    - Keep it under 100 words.
    - Output ONLY the enhanced prompt.`;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: systemPrompt
        }));
        return response.text || prompt;
    } catch (e) {
        return prompt;
    }
}

export async function generateVeoBroll(
    prompt: string,
    aspectRatio: '16:9' | '9:16',
    resolution: '720p' | '1080p',
    sourceImage: string | null,
    onProgress: (msg: string) => void
): Promise<string | null> {
    const ai = getAiClient();
    
    // Choose model based on resolution or user pref (user requested "bells and whistles" so high quality default)
    // However, fast-generate is usually better for 'B-roll' iterative creation.
    // Let's use fast-generate-preview for responsiveness as 'B-roll' implies volume.
    // Or allow toggling. For now, we'll default to the fast model for better UX latency, 
    // but the prompt implies quality. Let's stick to 'veo-3.1-generate-preview' if 1080p is requested.
    
    const model = resolution === '1080p' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
    
    onProgress(`INITIALIZING ${model.toUpperCase()}...`);

    try {
        let config: any = {
            numberOfVideos: 1,
            resolution: resolution,
            aspectRatio: aspectRatio,
        };

        let request: any = {
            model: model,
            prompt: prompt,
            config: config
        };

        if (sourceImage) {
            request.image = {
                imageBytes: sourceImage,
                mimeType: 'image/png'
            };
        }

        // Start generation
        let operation = await ai.models.generateVideos(request);
        
        onProgress("RENDERING VIDEO (THIS MAY TAKE 1-2 MIN)...");
        
        // Poll for completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
            operation = await ai.operations.getVideosOperation({operation: operation});
            if (operation.metadata?.state === 'FAILED') {
                throw new Error("Video generation failed on server.");
            }
        }
        
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("No video URI returned.");

        // Fetch the actual bytes (appending API key is required for Veo download links)
        onProgress("DOWNLOADING VIDEO...");
        const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error("Failed to download video bytes.");
        
        const blob = await response.blob();
        return URL.createObjectURL(blob); // Return object URL for playback
        
    } catch (e) {
        console.error("Veo generation failed", e);
        throw e;
    }
}

// VIDEO SCRIPT SCENE GENERATION
export async function generateScriptScene(
    sceneText: string,
    globalContext: string,
    style: string,
    styleReferenceImage: string | null,
    textMode: string = "No Text"
): Promise<string | null> {
    const ai = getAiClient();
    
    const parts: any[] = [];
    
    if (styleReferenceImage) {
        parts.push({
            inlineData: {
                data: styleReferenceImage,
                mimeType: "image/png"
            }
        });
    }

    let textInstruction = "";
    if (textMode === 'No Text (Clean)' || textMode === 'No Text') {
         textInstruction = "CRITICAL: Do NOT include any text, captions, or typography in the image. Pure visual only.";
    } else if (['Cinematic Label', 'Bold Title Overlay', 'Subtle Context Text'].some(t => textMode.includes(t))) {
         textInstruction = `Include ${textMode} style text elements in the image relevant to the scene (e.g., cinematic titles or labels).`;
    } else {
         // Custom instruction
         textInstruction = `TEXT RENDERING INSTRUCTION: "${textMode}". Integrate this text style or element into the image.`;
    }

    const prompt = `
    Create a CINEMATIC 16:9 BACKGROUND IMAGE for a YouTube video.
    
    GLOBAL STORY CONTEXT (Knowledge Base):
    "${globalContext.substring(0, 5000)}..."
    
    CURRENT SCENE SCRIPT (Spoken Words):
    "${sceneText}"
    
    VISUAL STYLE:
    ${style}
    ${styleReferenceImage ? "IMPORTANT: Use the provided image as a strict STYLE REFERENCE. Match the lighting, color palette, and art direction of the reference image." : ""}
    
    INSTRUCTIONS:
    - This image will be the background for the voiceover of the current scene.
    - It must be consistent with the global story context.
    - ${textInstruction}
    - 16:9 Aspect Ratio.
    - High quality, detailed, atmospheric.
    `;
    
    parts.push({ text: prompt });

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
                imageConfig: {
                    aspectRatio: "16:9"
                }
            }
        }));

        if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            return response.candidates[0].content.parts[0].inlineData.data;
        }
        return null;
    } catch (error) {
        console.error("Script scene generation failed", error);
        throw error;
    }
}

// ============================================
// SEO OPTIMIZATION FUNCTIONS
// ============================================

export interface SEOOptimizationResult {
    title?: string;
    content?: string;
    metaDescription?: string;
    keywords?: string[];
    suggestedKeyword?: string;
}

// Research high-volume, low-competition keywords related to content
export async function researchKeywords(
    content: string,
    topic: string,
    currentKeyword?: string
): Promise<{ keywords: string[]; primaryKeyword: string; analysis: string }> {
    const ai = getAiClient();

    const prompt = `
    You are an SEO keyword research expert. Analyze the following blog content and topic to find the BEST keywords.

    TOPIC: "${topic}"
    ${currentKeyword ? `CURRENT KEYWORD: "${currentKeyword}"` : ''}

    CONTENT PREVIEW:
    "${content.substring(0, 3000)}..."

    TASK: Research and identify HIGH-VOLUME, LOW-COMPETITION keywords that would help this content rank well in search engines.

    Use Google Search to find:
    1. Current trending searches related to this topic
    2. Common questions people ask about this topic
    3. Long-tail keyword variations
    4. Related LSI (Latent Semantic Indexing) keywords

    RETURN FORMAT (JSON only, no markdown):
    {
        "primaryKeyword": "the single best high-volume low-competition keyword phrase (2-4 words)",
        "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
        "analysis": "Brief explanation of why these keywords were chosen and their search intent"
    }

    Focus on keywords that:
    - Have high search volume (many people search for them)
    - Have low competition (fewer websites targeting them)
    - Match user search intent
    - Are specific enough to rank for (long-tail preferred)
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        }));

        const text = response.text || "";
        const jsonStr = cleanJsonString(text);
        const result = JSON.parse(jsonStr);

        return {
            keywords: result.keywords || [],
            primaryKeyword: result.primaryKeyword || (result.keywords?.[0] || ''),
            analysis: result.analysis || ''
        };
    } catch (error) {
        console.error("Keyword research failed:", error);
        throw new Error("Failed to research keywords");
    }
}

// Optimize title for SEO (50-60 characters, include keyword)
export async function optimizeTitle(
    currentTitle: string,
    content: string,
    targetKeyword: string
): Promise<string> {
    const ai = getAiClient();

    const prompt = `
    You are an SEO title optimization expert.

    CURRENT TITLE: "${currentTitle}"
    TARGET KEYWORD: "${targetKeyword}"
    CONTENT PREVIEW: "${content.substring(0, 1500)}..."

    TASK: Rewrite the title to be SEO-optimized.

    REQUIREMENTS:
    - Length: 50-60 characters (CRITICAL - must be within this range)
    - Include the target keyword naturally (preferably near the beginning)
    - Make it compelling and click-worthy
    - Maintain the core message of the original title

    RETURN: Only the optimized title text, nothing else. No quotes, no explanation.
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: prompt
        }));

        return (response.text || currentTitle).trim().replace(/^["']|["']$/g, '');
    } catch (error) {
        console.error("Title optimization failed:", error);
        throw new Error("Failed to optimize title");
    }
}

// Optimize meta description (150-160 characters)
export async function optimizeMetaDescription(
    currentDescription: string,
    title: string,
    content: string,
    targetKeyword: string
): Promise<string> {
    const ai = getAiClient();

    const prompt = `
    You are an SEO meta description expert.

    TITLE: "${title}"
    TARGET KEYWORD: "${targetKeyword}"
    CURRENT DESCRIPTION: "${currentDescription}"
    CONTENT PREVIEW: "${content.substring(0, 1500)}..."

    TASK: Write an SEO-optimized meta description.

    REQUIREMENTS:
    - Length: 150-160 characters (CRITICAL - must be within this range)
    - Include the target keyword naturally
    - Include a call-to-action or value proposition
    - Accurately summarize the content
    - Make it compelling to increase click-through rate

    RETURN: Only the meta description text, nothing else. No quotes, no explanation. Exactly 150-160 characters.
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: prompt
        }));

        let result = (response.text || '').trim().replace(/^["']|["']$/g, '');
        // Ensure it's within range
        if (result.length > 160) {
            result = result.substring(0, 157) + '...';
        }
        return result;
    } catch (error) {
        console.error("Meta description optimization failed:", error);
        throw new Error("Failed to optimize meta description");
    }
}

// Optimize heading structure
export async function optimizeHeadings(
    content: string,
    targetKeyword: string
): Promise<string> {
    const ai = getAiClient();

    const prompt = `
    You are an SEO content structure expert.

    TARGET KEYWORD: "${targetKeyword}"

    CONTENT:
    ${content}

    TASK: Restructure the content headings for optimal SEO.

    REQUIREMENTS:
    - Ensure at least 3-4 H2 headings (## in markdown)
    - Ensure at least 2-3 H3 subheadings (### in markdown)
    - Include the target keyword in at least one H2 heading
    - Use numbered sections where appropriate (e.g., "## 1. Introduction to...")
    - Make headings descriptive and keyword-rich
    - Maintain the original content and meaning
    - Keep all existing content, links, and formatting

    RETURN: The full content with optimized heading structure. Return the complete markdown content.
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: prompt
        }));

        return (response.text || content).trim();
    } catch (error) {
        console.error("Heading optimization failed:", error);
        throw new Error("Failed to optimize headings");
    }
}

// Optimize keyword density (1-2.5% optimal)
export async function optimizeKeywordDensity(
    content: string,
    targetKeyword: string
): Promise<string> {
    const ai = getAiClient();

    // Calculate current density
    const wordCount = content.split(/\s+/).length;
    const keywordCount = (content.toLowerCase().match(new RegExp(targetKeyword.toLowerCase(), 'g')) || []).length;
    const currentDensity = (keywordCount / wordCount) * 100;

    const prompt = `
    You are an SEO keyword optimization expert.

    TARGET KEYWORD: "${targetKeyword}"
    CURRENT KEYWORD COUNT: ${keywordCount} occurrences
    TOTAL WORDS: ${wordCount}
    CURRENT DENSITY: ${currentDensity.toFixed(2)}%
    OPTIMAL DENSITY: 1.5-2.0%

    CONTENT:
    ${content}

    TASK: Optimize the keyword density to achieve 1.5-2.0% density.

    REQUIREMENTS:
    ${currentDensity < 1 ? '- ADD more natural occurrences of the keyword and related variations' : ''}
    ${currentDensity > 2.5 ? '- REDUCE keyword usage to avoid over-optimization' : ''}
    - Insert keywords naturally in context (don't force them)
    - Use keyword variations and synonyms (LSI keywords)
    - Add keywords in strategic positions (first paragraph, headings, conclusion)
    - Maintain readability and natural flow
    - Keep all existing links, images markers, and formatting
    - Do NOT change [[IMAGE_X]] placeholders

    RETURN: The full optimized content. Return complete markdown.
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: prompt
        }));

        return (response.text || content).trim();
    } catch (error) {
        console.error("Keyword optimization failed:", error);
        throw new Error("Failed to optimize keywords");
    }
}

// Optimize readability (shorter sentences, clearer language)
export async function optimizeReadability(
    content: string
): Promise<string> {
    const ai = getAiClient();

    const prompt = `
    You are a content readability expert.

    CONTENT:
    ${content}

    TASK: Optimize the content for maximum readability.

    REQUIREMENTS:
    - Break long sentences into shorter ones (aim for average 15-20 words per sentence)
    - Use simple, clear language
    - Add transition words for flow
    - Use bullet points where appropriate for lists
    - Break long paragraphs into shorter ones (2-4 sentences max)
    - Maintain the original meaning and all information
    - Keep all markdown formatting, links, and [[IMAGE_X]] placeholders intact
    - Keep all headings (##, ###) exactly as they are

    RETURN: The full optimized content with improved readability. Return complete markdown.
    `;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: prompt
        }));

        return (response.text || content).trim();
    } catch (error) {
        console.error("Readability optimization failed:", error);
        throw new Error("Failed to optimize readability");
    }
}

// Comprehensive SEO optimization that runs until all scores are above target
export async function optimizeAllSEO(
    title: string,
    content: string,
    metaDescription: string,
    currentKeyword: string,
    onProgress: (stage: string, scores: { [key: string]: number }) => void,
    targetScore: number = 90
): Promise<{
    title: string;
    content: string;
    metaDescription: string;
    keyword: string;
}> {
    const ai = getAiClient();

    // Helper to calculate scores
    const calculateScores = (t: string, c: string, meta: string, kw: string) => {
        const scores: { [key: string]: number } = {};

        // Title
        const titleLen = t.length;
        if (titleLen >= 50 && titleLen <= 60) scores.title = 100;
        else if (titleLen >= 40 && titleLen <= 70) scores.title = 75;
        else scores.title = 50;

        // Meta
        const metaLen = meta.length;
        if (metaLen >= 150 && metaLen <= 160) scores.meta = 100;
        else if (metaLen >= 120 && metaLen <= 180) scores.meta = 75;
        else if (metaLen === 0) scores.meta = 25;
        else scores.meta = 50;

        // Headings
        const h2Count = (c.match(/^## /gm) || []).length;
        const h3Count = (c.match(/^### /gm) || []).length;
        if (h2Count >= 3 && h3Count >= 2) scores.headings = 100;
        else if (h2Count >= 2) scores.headings = 75;
        else scores.headings = 50;

        // Keywords
        if (kw) {
            const keywordCount = (c.toLowerCase().match(new RegExp(kw.toLowerCase(), 'g')) || []).length;
            const density = (keywordCount / c.split(' ').length) * 100;
            if (density >= 1 && density <= 2.5) scores.keywords = 100;
            else if (density > 0) scores.keywords = 75;
            else scores.keywords = 25;
        } else {
            scores.keywords = 50;
        }

        // Readability
        const sentences = c.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgLen = sentences.reduce((acc, s) => acc + s.split(' ').length, 0) / sentences.length;
        if (avgLen <= 20) scores.readability = 100;
        else if (avgLen <= 25) scores.readability = 75;
        else scores.readability = 50;

        return scores;
    };

    let optimizedTitle = title;
    let optimizedContent = content;
    let optimizedMeta = metaDescription;
    let optimizedKeyword = currentKeyword;

    // Step 1: Research keywords if none provided or score is low
    onProgress("Researching optimal keywords...", calculateScores(optimizedTitle, optimizedContent, optimizedMeta, optimizedKeyword));

    if (!optimizedKeyword) {
        try {
            const keywordResult = await researchKeywords(optimizedContent, optimizedTitle, optimizedKeyword);
            optimizedKeyword = keywordResult.primaryKeyword;
        } catch (e) {
            console.warn("Keyword research failed, continuing with other optimizations");
        }
    }

    let scores = calculateScores(optimizedTitle, optimizedContent, optimizedMeta, optimizedKeyword);
    let iterations = 0;
    const maxIterations = 3;

    // Iterative optimization loop
    while (iterations < maxIterations) {
        iterations++;

        // Optimize Title if below target
        if (scores.title < targetScore) {
            onProgress(`Optimizing title (iteration ${iterations})...`, scores);
            try {
                optimizedTitle = await optimizeTitle(optimizedTitle, optimizedContent, optimizedKeyword);
                scores = calculateScores(optimizedTitle, optimizedContent, optimizedMeta, optimizedKeyword);
            } catch (e) {
                console.warn("Title optimization failed:", e);
            }
        }

        // Optimize Meta Description if below target
        if (scores.meta < targetScore) {
            onProgress(`Optimizing meta description (iteration ${iterations})...`, scores);
            try {
                optimizedMeta = await optimizeMetaDescription(optimizedMeta, optimizedTitle, optimizedContent, optimizedKeyword);
                scores = calculateScores(optimizedTitle, optimizedContent, optimizedMeta, optimizedKeyword);
            } catch (e) {
                console.warn("Meta optimization failed:", e);
            }
        }

        // Optimize Headings if below target
        if (scores.headings < targetScore) {
            onProgress(`Optimizing heading structure (iteration ${iterations})...`, scores);
            try {
                optimizedContent = await optimizeHeadings(optimizedContent, optimizedKeyword);
                scores = calculateScores(optimizedTitle, optimizedContent, optimizedMeta, optimizedKeyword);
            } catch (e) {
                console.warn("Heading optimization failed:", e);
            }
        }

        // Optimize Keywords if below target
        if (scores.keywords < targetScore) {
            onProgress(`Optimizing keyword density (iteration ${iterations})...`, scores);
            try {
                optimizedContent = await optimizeKeywordDensity(optimizedContent, optimizedKeyword);
                scores = calculateScores(optimizedTitle, optimizedContent, optimizedMeta, optimizedKeyword);
            } catch (e) {
                console.warn("Keyword optimization failed:", e);
            }
        }

        // Optimize Readability if below target
        if (scores.readability < targetScore) {
            onProgress(`Optimizing readability (iteration ${iterations})...`, scores);
            try {
                optimizedContent = await optimizeReadability(optimizedContent);
                scores = calculateScores(optimizedTitle, optimizedContent, optimizedMeta, optimizedKeyword);
            } catch (e) {
                console.warn("Readability optimization failed:", e);
            }
        }

        // Check if all scores are above target
        const allAboveTarget = Object.values(scores).every(s => s >= targetScore);
        if (allAboveTarget) {
            break;
        }
    }

    onProgress("SEO optimization complete!", scores);

    return {
        title: optimizedTitle,
        content: optimizedContent,
        metaDescription: optimizedMeta,
        keyword: optimizedKeyword
    };
}

// ============================================
// VIRAL POST ANALYZER FUNCTIONS
// ============================================

import type {
    ViralPostAnalysisResult,
    ViralStructureBreakdown,
    PsychologicalTriggerMap,
    AlgorithmScore,
    ConversionScore,
    PlatformRewrite,
    ContentDNASummary,
    ViralFormulaJSON,
    HookCategory,
    PacingType,
    AudienceIntent
} from '../types';

// Fetch social post content from URL using Jina AI
async function fetchSocialPostContent(url: string): Promise<{ content: string; platform: string }> {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const headers: Record<string, string> = {
        'Accept': 'application/json',
    };

    if (process.env.JINA_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;
    }

    try {
        const response = await fetch(jinaUrl, { headers });
        if (!response.ok) {
            throw new Error(`Jina Reader API returned status ${response.status}`);
        }

        const data = await response.json();

        // Detect platform from URL
        let platform = 'Unknown';
        const urlLower = url.toLowerCase();
        if (urlLower.includes('tiktok.com')) platform = 'TikTok';
        else if (urlLower.includes('instagram.com')) platform = 'Instagram';
        else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) platform = 'X';
        else if (urlLower.includes('linkedin.com')) platform = 'LinkedIn';
        else if (urlLower.includes('facebook.com')) platform = 'Facebook';
        else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) platform = 'YouTube';

        let content = '';
        if (data.title) content += data.title + '\n\n';
        if (data.description) content += data.description + '\n\n';
        if (data.content) content += data.content;

        return { content: content.trim(), platform };
    } catch (error: any) {
        console.error('Failed to fetch social post content:', error);
        throw new Error(`Failed to fetch post content: ${error.message}`);
    }
}

// Main viral post analysis function
export async function analyzeViralPost(
    input: { type: 'url' | 'text' | 'image'; content: string; platform?: string },
    onProgress: (stage: string) => void
): Promise<ViralPostAnalysisResult> {
    const ai = getAiClient();

    let postContent = '';
    let detectedPlatform = input.platform || 'Unknown';
    let useGoogleSearch = false;
    let urlToAnalyze = '';

    // PHASE 1: Content Extraction
    onProgress("EXTRACTING POST CONTENT...");

    if (input.type === 'url') {
        urlToAnalyze = input.content;

        // Detect platform from URL
        const urlLower = input.content.toLowerCase();
        if (urlLower.includes('tiktok.com')) detectedPlatform = 'TikTok';
        else if (urlLower.includes('instagram.com')) detectedPlatform = 'Instagram';
        else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) detectedPlatform = 'X';
        else if (urlLower.includes('linkedin.com')) detectedPlatform = 'LinkedIn';
        else if (urlLower.includes('facebook.com')) detectedPlatform = 'Facebook';
        else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) detectedPlatform = 'YouTube';

        try {
            const fetched = await fetchSocialPostContent(input.content);
            postContent = fetched.content;
            if (fetched.platform !== 'Unknown') {
                detectedPlatform = fetched.platform;
            }
            // Check if we actually got meaningful content
            if (!postContent || postContent.trim().length < 20) {
                throw new Error('Insufficient content fetched');
            }
        } catch (e) {
            // Fallback to Google Search - we'll include the URL in the prompt
            onProgress("FETCHING VIA GOOGLE SEARCH...");
            useGoogleSearch = true;
            postContent = ''; // Will be fetched by AI using Google Search
        }
    } else if (input.type === 'text') {
        postContent = input.content;
        if (!postContent || postContent.trim().length < 5) {
            throw new Error('Please provide post content to analyze');
        }
    } else if (input.type === 'image') {
        // For image analysis, we need the caption or will analyze visually
        postContent = '[Image uploaded - analyzing visual content]';
    }

    // PHASE 2: Deep Analysis with AI
    onProgress("ANALYZING VIRAL MECHANICS...");

    // Build the analysis prompt based on whether we have content or need to fetch via search
    let contentSection = '';
    if (useGoogleSearch && urlToAnalyze) {
        contentSection = `URL TO ANALYZE: ${urlToAnalyze}

IMPORTANT: Use Google Search to access and analyze the content at this URL. Extract the full post text, caption, or description from this social media post. Then analyze the extracted content.`;
    } else {
        contentSection = `Content:
${postContent}`;
    }

    const analysisPrompt = `You are an elite viral content strategist and growth consultant with expertise in social media psychology, copywriting, and platform algorithms.

${useGoogleSearch ? 'FIRST: Use Google Search to fetch the content from the URL below. Extract the post text/caption, then analyze it.' : 'ANALYZE THIS SOCIAL MEDIA POST:'}
---
Platform: ${detectedPlatform}
${contentSection}
---

Perform a DEEP REVERSE-ENGINEERING analysis of the post content. Return a comprehensive JSON response with the following structure (NO markdown, just valid JSON):

{
    "structure": {
        "hookCategory": "Curiosity|Shock|Authority|Story|Fear|Desire|Controversy|Mystery",
        "hookText": "The exact hook/opening line from the post",
        "sentenceRhythm": "Description of the rhythm pattern (e.g., 'Short-Short-Long', 'Punchy staccato', etc.)",
        "lineBreakStrategy": "How line breaks are used for effect",
        "emojiPsychology": "Analysis of emoji usage and psychological effect, or null if none",
        "pacingType": "Fast|Medium|Slow",
        "contentLengthClass": "Micro|Short|Medium|Long|Thread"
    },
    "psychology": {
        "primaryEmotion": "The dominant emotion being triggered",
        "secondaryEmotion": "The supporting emotion",
        "patternInterrupt": "What pattern interrupt technique is used",
        "socialValidation": "How social proof/validation is established",
        "urgencySignal": "Any urgency/FOMO tactics used, or null",
        "scarcityTactic": "Any scarcity messaging, or null",
        "identityAppeal": "What identity/tribe is being appealed to"
    },
    "algorithmScore": {
        "overall": 75,
        "engagementBaiting": { "score": 70, "reason": "explanation of score" },
        "retentionTriggers": { "score": 75, "reason": "explanation of score" },
        "rewatchFactor": { "score": 65, "reason": "explanation of score" },
        "commentActivation": { "score": 80, "reason": "explanation of score" },
        "shareMotivation": { "score": 70, "reason": "explanation of score" }
    },
    "conversionScore": {
        "overall": 70,
        "ctaClarity": { "score": 65, "reason": "explanation of score" },
        "trustIndicators": { "score": 75, "reason": "explanation of score" },
        "offerPositioning": { "score": 70, "reason": "explanation of score" },
        "curiosityGap": { "score": 80, "reason": "explanation of score" }
    },
    "audienceIntent": "Learning|Buying|Entertaining|Inspiring|Problem-Solving",
    "visualTriggerType": "Description of visual strategy if applicable",
    "contentDNA": {
        "whyItWentViral": "Detailed analysis of why this content succeeded or has viral potential",
        "commonMistakesCopying": "What most people would do wrong when copying this",
        "ethicalReplicationGuide": "How to ethically replicate this success"
    },
    "viralFormula": {
        "hookFormula": "Template formula for the hook (e.g., '[Contrarian statement] + [Promise]')",
        "structurePattern": "The structural pattern template",
        "emotionalSequence": ["emotion1", "emotion2", "emotion3"],
        "ctaTemplate": "Template for the call-to-action",
        "platformOptimizations": {
            "TikTok": "Specific optimization for TikTok",
            "Instagram": "Specific optimization for Instagram",
            "X": "Specific optimization for X/Twitter",
            "LinkedIn": "Specific optimization for LinkedIn",
            "Facebook": "Specific optimization for Facebook"
        }
    },
    "matchingHooks": [
        "Alternative hook 1 using the same formula",
        "Alternative hook 2 using the same formula",
        "Alternative hook 3 using the same formula",
        "Alternative hook 4 using the same formula",
        "Alternative hook 5 using the same formula"
    ],
    "extractedContent": "The actual post text/caption that was analyzed"
}

IMPORTANT RULES:
- All scores must be realistic numbers between 1-100 (not 0)
- Provide detailed, specific reasons for each score
- The hookText must be the actual opening line from the post
- matchingHooks should be NEW hooks inspired by the formula, not copies
- Be extremely detailed and analytical
- Focus on actionable insights`;

    let analysisResult: any = {};

    try {
        const analysisResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: analysisPrompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        }));

        const responseText = analysisResponse.text || "{}";
        const jsonStr = cleanJsonString(responseText);
        analysisResult = JSON.parse(jsonStr);

        // If we used Google Search, update postContent with what was extracted
        if (useGoogleSearch && analysisResult.extractedContent) {
            postContent = analysisResult.extractedContent;
        } else if (useGoogleSearch && !postContent) {
            // Try to extract from hookText if available
            postContent = analysisResult.structure?.hookText || 'Content analyzed via URL';
        }

        // Validate that we got real analysis (not defaults)
        if (!analysisResult.structure || !analysisResult.psychology) {
            throw new Error('Incomplete analysis returned');
        }
    } catch (e) {
        console.error("Analysis parsing failed:", e);
        throw new Error("Failed to analyze viral post mechanics. Please try with different content or paste the text directly.");
    }

    // PHASE 3: Generate Platform Rewrites
    onProgress("GENERATING PLATFORM REWRITES...");

    const rewritePrompt = `Based on this viral post analysis, generate PLATFORM-OPTIMIZED REWRITES.

ORIGINAL POST:
${postContent}

VIRAL FORMULA DETECTED:
${JSON.stringify(analysisResult.viralFormula, null, 2)}

Generate rewrites for each platform. Return JSON array (no markdown):

{
    "platformRewrites": [
        {
            "platform": "TikTok",
            "content": "Full rewritten post optimized for TikTok (short, punchy, hooks in first line, trending format)",
            "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
            "characterCount": 150,
            "optimizationNotes": "Why this version works for TikTok"
        },
        {
            "platform": "Instagram",
            "content": "Full rewritten post optimized for Instagram (visual-first, story-driven, carousel-friendly)",
            "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
            "characterCount": 2200,
            "optimizationNotes": "Why this version works for Instagram"
        },
        {
            "platform": "X",
            "content": "Full rewritten post optimized for X/Twitter (280 chars max, thread-starter potential, ratio-resistant)",
            "hashtags": ["hashtag1", "hashtag2"],
            "characterCount": 280,
            "optimizationNotes": "Why this version works for X"
        },
        {
            "platform": "LinkedIn",
            "content": "Full rewritten post optimized for LinkedIn (professional tone, thought leadership, engagement questions)",
            "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
            "characterCount": 3000,
            "optimizationNotes": "Why this version works for LinkedIn"
        },
        {
            "platform": "Facebook",
            "content": "Full rewritten post optimized for Facebook (community-focused, shareable, discussion-starter)",
            "hashtags": ["hashtag1", "hashtag2"],
            "characterCount": 500,
            "optimizationNotes": "Why this version works for Facebook"
        }
    ],
    "brandFriendlyVersions": [
        "Brand-safe version 1: Conservative, no controversy, professional",
        "Brand-safe version 2: Friendly tone, inclusive language",
        "Brand-safe version 3: Educational focus, value-driven"
    ],
    "aggressiveVersions": [
        "High-CTR version 1: Bold claims, strong hooks, urgency",
        "High-CTR version 2: Controversial angle, polarizing",
        "High-CTR version 3: Fear-based, problem-agitation-solution"
    ]
}

IMPORTANT: Do NOT plagiarize. Only replicate STRUCTURE and PSYCHOLOGICAL MECHANICS. Create ORIGINAL content with the same viral DNA.`;

    let rewriteResult: any = {};

    try {
        const rewriteResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: rewritePrompt
        }));

        const responseText = rewriteResponse.text || "{}";
        const jsonStr = cleanJsonString(responseText);
        rewriteResult = JSON.parse(jsonStr);
    } catch (e) {
        console.error("Rewrite generation failed:", e);
        rewriteResult = {
            platformRewrites: [],
            brandFriendlyVersions: [],
            aggressiveVersions: []
        };
    }

    // Enforce Twitter character limit on X platform rewrite
    if (rewriteResult.platformRewrites) {
        rewriteResult.platformRewrites = rewriteResult.platformRewrites.map((rewrite: any) => {
            if (rewrite.platform === 'X' && rewrite.content) {
                rewrite.content = enforceTwitterCharLimit(rewrite.content);
                rewrite.characterCount = rewrite.content.length;
            }
            return rewrite;
        });
    }

    onProgress("ANALYSIS COMPLETE!");

    // Use extracted content if available (from Google Search), otherwise use original postContent
    const displayContent = analysisResult.extractedContent || postContent || 'Content analyzed';

    // Compile final result with proper fallbacks
    const finalResult: ViralPostAnalysisResult = {
        originalContent: displayContent,
        platform: detectedPlatform,
        structure: {
            hookCategory: (analysisResult.structure?.hookCategory || 'Curiosity') as HookCategory,
            hookText: analysisResult.structure?.hookText || displayContent.split('\n')[0]?.substring(0, 100) || 'Hook not detected',
            sentenceRhythm: analysisResult.structure?.sentenceRhythm || 'Standard rhythm pattern',
            lineBreakStrategy: analysisResult.structure?.lineBreakStrategy || 'Natural paragraph breaks',
            emojiPsychology: analysisResult.structure?.emojiPsychology || null,
            pacingType: (analysisResult.structure?.pacingType || 'Medium') as PacingType,
            contentLengthClass: analysisResult.structure?.contentLengthClass || 'Medium'
        },
        psychology: {
            primaryEmotion: analysisResult.psychology?.primaryEmotion || 'Interest',
            secondaryEmotion: analysisResult.psychology?.secondaryEmotion || 'Curiosity',
            patternInterrupt: analysisResult.psychology?.patternInterrupt || 'Opening hook',
            socialValidation: analysisResult.psychology?.socialValidation || 'Implicit expertise',
            urgencySignal: analysisResult.psychology?.urgencySignal || null,
            scarcityTactic: analysisResult.psychology?.scarcityTactic || null,
            identityAppeal: analysisResult.psychology?.identityAppeal || 'General audience'
        },
        algorithmScore: {
            overall: analysisResult.algorithmScore?.overall || 50,
            engagementBaiting: analysisResult.algorithmScore?.engagementBaiting || { score: 50, reason: 'Moderate engagement potential' },
            retentionTriggers: analysisResult.algorithmScore?.retentionTriggers || { score: 50, reason: 'Standard retention elements' },
            rewatchFactor: analysisResult.algorithmScore?.rewatchFactor || { score: 50, reason: 'Average rewatch appeal' },
            commentActivation: analysisResult.algorithmScore?.commentActivation || { score: 50, reason: 'Moderate comment potential' },
            shareMotivation: analysisResult.algorithmScore?.shareMotivation || { score: 50, reason: 'Average share motivation' }
        },
        conversionScore: {
            overall: analysisResult.conversionScore?.overall || 50,
            ctaClarity: analysisResult.conversionScore?.ctaClarity || { score: 50, reason: 'CTA could be clearer' },
            trustIndicators: analysisResult.conversionScore?.trustIndicators || { score: 50, reason: 'Moderate trust signals' },
            offerPositioning: analysisResult.conversionScore?.offerPositioning || { score: 50, reason: 'Standard positioning' },
            curiosityGap: analysisResult.conversionScore?.curiosityGap || { score: 50, reason: 'Some curiosity elements' }
        },
        platformRewrites: rewriteResult.platformRewrites || [],
        brandFriendlyVersions: rewriteResult.brandFriendlyVersions || [],
        aggressiveVersions: rewriteResult.aggressiveVersions || [],
        contentDNA: {
            whyItWentViral: analysisResult.contentDNA?.whyItWentViral || 'Analysis pending - content may need more context',
            commonMistakesCopying: analysisResult.contentDNA?.commonMistakesCopying || 'Copying surface elements without understanding the underlying psychology',
            ethicalReplicationGuide: analysisResult.contentDNA?.ethicalReplicationGuide || 'Focus on the structural formula and emotional triggers, not the specific words'
        },
        matchingHooks: analysisResult.matchingHooks || [],
        viralFormula: {
            hookFormula: analysisResult.viralFormula?.hookFormula || '[Statement] + [Promise/Benefit]',
            structurePattern: analysisResult.viralFormula?.structurePattern || 'Hook → Context → Value → CTA',
            emotionalSequence: analysisResult.viralFormula?.emotionalSequence || ['Curiosity', 'Interest', 'Desire'],
            ctaTemplate: analysisResult.viralFormula?.ctaTemplate || 'Engage or follow for more',
            platformOptimizations: analysisResult.viralFormula?.platformOptimizations || {}
        },
        visualTriggerType: analysisResult.visualTriggerType,
        audienceIntent: (analysisResult.audienceIntent || 'Entertaining') as AudienceIntent
    };

    return finalResult;
}

// Generate a custom post from viral formula
export async function generatePostFromViralFormula(
    formula: ViralFormulaJSON,
    topic: string,
    platform: string,
    tone: 'brand-friendly' | 'aggressive' | 'balanced'
): Promise<string> {
    const ai = getAiClient();

    const prompt = `You are a viral content creator. Using this proven viral formula, create a NEW ORIGINAL post.

VIRAL FORMULA:
- Hook Formula: ${formula.hookFormula}
- Structure Pattern: ${formula.structurePattern}
- Emotional Sequence: ${formula.emotionalSequence.join(' → ')}
- CTA Template: ${formula.ctaTemplate}
- Platform Optimization: ${formula.platformOptimizations[platform] || 'Standard optimization'}

TOPIC: ${topic}
PLATFORM: ${platform}
TONE: ${tone}

Generate a post that:
1. Uses the exact hook formula
2. Follows the structure pattern
3. Triggers the emotional sequence
4. Ends with a CTA following the template
5. Is optimized for ${platform}

Return ONLY the post content. No explanation, no quotes, just the post.`;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: prompt
        }));

        let result = (response.text || '').trim();

        // Enforce platform limits
        if (platform === 'X' || platform === 'Twitter') {
            result = enforceTwitterCharLimit(result);
        }

        return result;
    } catch (error) {
        console.error("Post generation failed:", error);
        throw new Error("Failed to generate post from viral formula");
    }
}

// Generate matching hooks based on analyzed viral formula
export async function generateMatchingHooks(
    formula: ViralFormulaJSON,
    topic: string,
    count: number = 10
): Promise<string[]> {
    const ai = getAiClient();

    const prompt = `You are a viral hook specialist. Generate ${count} viral hooks using this proven formula.

HOOK FORMULA: ${formula.hookFormula}
EMOTIONAL SEQUENCE STARTER: ${formula.emotionalSequence[0] || 'Curiosity'}

TOPIC: ${topic}

Generate ${count} unique hooks that:
1. Follow the exact formula structure
2. Trigger the target emotion immediately
3. Create irresistible curiosity gaps
4. Would work across multiple platforms

Return as JSON array of strings (no markdown):
["Hook 1", "Hook 2", "Hook 3", ...]`;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: prompt
        }));

        const responseText = response.text || "[]";
        const jsonStr = cleanJsonString(responseText);
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Hook generation failed:", error);
        return [];
    }
}

// Convert viral post to carousel format
export async function convertViralPostToCarousel(
    analysis: ViralPostAnalysisResult,
    slideCount: number = 5
): Promise<{ slides: { title: string; content: string }[]; caption: string }> {
    const ai = getAiClient();

    const prompt = `Convert this viral post into a ${slideCount}-slide carousel format.

ORIGINAL POST:
${analysis.originalContent}

VIRAL ELEMENTS TO PRESERVE:
- Hook: ${analysis.structure.hookText}
- Emotional Sequence: ${analysis.viralFormula.emotionalSequence.join(' → ')}
- CTA: ${analysis.viralFormula.ctaTemplate}

Create a carousel structure:
- Slide 1: Hook (attention-grabbing title)
- Slides 2-${slideCount - 1}: Key points (one idea per slide)
- Slide ${slideCount}: CTA slide

Return JSON (no markdown):
{
    "slides": [
        { "title": "Slide 1 title", "content": "Slide 1 content (max 20 words)" },
        { "title": "Slide 2 title", "content": "Slide 2 content" },
        ...
    ],
    "caption": "Engaging caption for the carousel post with hashtags"
}`;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: prompt
        }));

        const responseText = response.text || "{}";
        const jsonStr = cleanJsonString(responseText);
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Carousel conversion failed:", error);
        return { slides: [], caption: '' };
    }
}

// Convert viral post to blog format
export async function convertViralPostToBlog(
    analysis: ViralPostAnalysisResult,
    length: 'short' | 'medium' | 'long'
): Promise<{ title: string; content: string; metaDescription: string }> {
    const ai = getAiClient();

    const wordCount = length === 'short' ? 500 : length === 'medium' ? 1000 : 2000;

    const prompt = `Expand this viral social media post into a ${wordCount}-word blog article.

ORIGINAL POST:
${analysis.originalContent}

VIRAL DNA TO PRESERVE:
- Hook Formula: ${analysis.viralFormula.hookFormula}
- Emotional Sequence: ${analysis.viralFormula.emotionalSequence.join(' → ')}
- Why It Went Viral: ${analysis.contentDNA.whyItWentViral}

Create a blog post that:
1. Opens with a hook using the same formula
2. Expands each point with depth and examples
3. Maintains the emotional journey
4. Includes subheadings for scannability
5. Ends with a compelling CTA

Return JSON (no markdown):
{
    "title": "SEO-optimized blog title",
    "content": "Full markdown content with ## headings",
    "metaDescription": "150-160 character meta description"
}`;

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: prompt
        }));

        const responseText = response.text || "{}";
        const jsonStr = cleanJsonString(responseText);
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Blog conversion failed:", error);
        return { title: '', content: '', metaDescription: '' };
    }
}

// Analyze image for visual viral triggers
export async function analyzeViralImage(
    imageBase64: string
): Promise<{
    visualTriggers: string[];
    colorPsychology: string;
    compositionAnalysis: string;
    attentionFlow: string;
    recommendations: string[];
}> {
    const ai = getAiClient();

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: imageBase64
                        }
                    },
                    {
                        text: `Analyze this social media image for viral potential.

Return JSON (no markdown):
{
    "visualTriggers": ["trigger1", "trigger2", "trigger3"],
    "colorPsychology": "Analysis of color choices and emotional impact",
    "compositionAnalysis": "How the composition guides attention",
    "attentionFlow": "Where the eye naturally goes and why",
    "recommendations": ["improvement1", "improvement2", "improvement3"]
}`
                    }
                ]
            }
        }));

        const responseText = response.text || "{}";
        const jsonStr = cleanJsonString(responseText);
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Image analysis failed:", error);
        return {
            visualTriggers: [],
            colorPsychology: '',
            compositionAnalysis: '',
            attentionFlow: '',
            recommendations: []
        };
    }
}