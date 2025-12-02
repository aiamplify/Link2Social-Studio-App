/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { RepoFileTree, Citation, SocialPost, CarouselResult, CarouselSlide, BlogPostResult, BlogVisual } from '../types';

// Helper to ensure we always get the freshest key from the environment
// immediately before a call.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Robust retry logic for 503 Service Unavailable / Overloaded errors
async function withRetry<T>(operation: () => Promise<T>, retries = 3, baseDelay = 3000): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      // Check for 503 or "overloaded" message
      const isOverloaded = error.status === 503 || error.code === 503 || 
                           (error.message && error.message.toLowerCase().includes('overloaded'));
      
      if (isOverloaded && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i); // Exponential backoff: 3s, 6s, 12s
        console.warn(`Gemini Model Overloaded (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`);
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
        return { imageData, citations, socialPosts };
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
    onProgress: (stage: string) => void
): Promise<CarouselResult> {
    const ai = getAiClient();

    // Step 1: Plan the Carousel
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

    const planPrompt = `
    ${contextInstruction}
    
    Create a plan for a 4-slide LinkedIn/Instagram social media carousel.
    TARGET LANGUAGE: ${language}.
    
    Return a valid JSON object with the following structure:
    {
      "caption": "The text for the LinkedIn/Instagram post caption including hashtags.",
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
    `;
    
    parts.push({ text: planPrompt });

    let plan: any = {};
    try {
        const planResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }],
                // Removed responseMimeType to avoid config violation with tools
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

    return {
        slides,
        caption: plan.caption || "Check out this new carousel!"
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
    
    // Step 1: Analyze and Write
    onProgress("RESEARCHING & ANALYZING...");
    
    // Map length to word count approx
    const wordCount = length === 'Short' ? '500' 
        : length === 'Medium' ? '1000' 
        : length === 'Long' ? '2000' 
        : '3000';
    
    let contextPrompt = "";
    if (source.type === 'url') {
        contextPrompt = `1. Access and analyze the content of this article: ${source.content} using Google Search.`;
    } else if (source.type === 'text') {
        contextPrompt = `1. Analyze the following provided research/text document as the primary source material:\n"${source.content.substring(0, 8000)}..."`;
    } else {
        contextPrompt = `1. Research the topic "${source.content}" using Google Search to ensure up-to-date and accurate information.`;
    }

    const writingPrompt = `
    You are an expert technical writer and professional blogger.
    
    Your task:
    ${contextPrompt}
    
    2. USER INSTRUCTIONS: "${instructions}"
    
    3. Write a COMPLETELY NEW, ORIGINAL blog post. 
       - ${source.type === 'url' ? "Do NOT just summarize the existing article. Add a fresh perspective." : "Create a comprehensive post based on the findings."}
       - The tone should be engaging, professional, and visually varied.
       - APPROXIMATE LENGTH: ${wordCount} words.
       - FORMATTING REQUIREMENTS (CRITICAL):
         - Use RICH MARKDOWN formatting.
         - Structure content with clear Header Levels: # Title, ## Section, ### Subsection.
         - Use **Bold** for strong emphasis.
         - Use *Italic* for subtle emphasis.
         - Use bulleted lists (-) for readability.
         - STYLING INSTRUCTION: You MUST use HTML tags for specific visual emphasis:
            - Use <span class="blue">text</span> to highlight key concepts, terminology, or important phrases in BLUE.
            - Use <u>text</u> to underline critical points that need attention.
    
    4. VISUAL PLACEMENT:
       - You must generate ${imageCount} DISTINCT visual concepts to accompany the post.
       - The first visual will be the Header Image.
       - For the remaining ${Math.max(0, imageCount - 1)} visuals, you MUST insert a placeholder marker EXACTLY like this: [[IMAGE_X]] (where X is the number, e.g., [[IMAGE_1]], [[IMAGE_2]]) directly into the markdown text flow where the image should visually appear (e.g., after a relevant paragraph).
    
    The blog post must be written in ${language}.
    The visual prompts must be in English.
    
    RETURN FORMAT:
    Use strict delimiters.
    
    |||TITLE|||
    (Insert Main Title Here)
    |||SUBTITLE|||
    (Insert a short, engaging subtitle here)
    |||METADATA|||
    (Insert "Author Name | Date | Category")
    |||CONTENT|||
    (Insert Full Markdown Content Here, starting with Introduction, and including [[IMAGE_X]] markers within the body. Do not repeat Title/Subtitle)
    
    |||VISUALS|||
    (List the ${imageCount} visual prompts strictly in this format:)
    1. PROMPT: [Detailed prompt] || CAPTION: [Short caption]
    2. PROMPT: [Detailed prompt] || CAPTION: [Short caption]
    ...
    `;

    let visuals: BlogVisual[] = [];
    let content = "";
    let title = "Generated Blog Post";
    let subtitle = "";
    let metadata = "AI Writer | Today | Tech";
    
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview', 
            contents: writingPrompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
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
    You are an expert content creator and technical writer.
    
    Your task:
    1. Access and analyze the content of this YouTube video: ${videoUrl} using Google Search tools to find transcripts, summaries, or descriptions.
    2. Understand the core topic, key takeaways, and speaker's perspective.
    3. Write a COMPLETELY NEW, COMPREHENSIVE blog post based on the video content.
       - Structure it with clear headings.
       - Capture the detailed points made in the video.
       - The tone should be engaging and educational.
       - FORMATTING: Use RICH MARKDOWN formatting.
    4. Create a prompt for a header image that visually represents the core topic.
    
    The blog post must be written in ${language}.
    The image prompt must be in English.
    
    RETURN FORMAT:
    Do NOT use JSON. Use the following strict delimiters to separate the sections:
    
    |||TITLE|||
    (Insert Title Here)
    |||SUBTITLE|||
    (Insert Subtitle)
    |||METADATA|||
    (Insert Author | Date | Category)
    |||IMAGE_PROMPT|||
    (Insert Image Prompt Here)
    |||CONTENT|||
    (Insert Full Markdown Content Here)
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