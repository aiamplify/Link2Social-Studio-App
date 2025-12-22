/**
 * OpenRouter API Service
 *
 * Service for deep research using OpenRouter API with various AI models.
 * Provides fact-checking and citation extraction for blog content accuracy.
 *
 * Environment Variable: OPENROUTER_API_KEY
 */

import {
    Citation,
    VerifiedCitation,
    FactCheckResult,
    FactCheckClaim,
    OpenRouterModel,
    OpenRouterResearchResult
} from '../types';

// =============================================================================
// CONSTANTS
// =============================================================================

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Available deep research models
export const DEEP_RESEARCH_MODELS: OpenRouterModel[] = [
    {
        id: 'perplexity/sonar-deep-research',
        name: 'Perplexity Sonar Deep Research',
        description: 'Best for comprehensive web research with citations',
        badge: 'Recommended'
    },
    {
        id: 'alibaba/tongyi-deepresearch-30b-a3b:free',
        name: 'Tongyi DeepResearch (Free)',
        description: 'Free deep research model with good quality',
        badge: 'Free'
    },
    {
        id: 'openai/o4-mini-deep-research',
        name: 'OpenAI o4-mini Deep Research',
        description: 'Fast, efficient deep research',
        badge: undefined
    },
    {
        id: 'openai/o3-deep-research',
        name: 'OpenAI o3 Deep Research',
        description: 'Most capable deep research model',
        badge: 'Premium'
    },
    {
        id: 'nousresearch/deephermes-3-mistral-24b-preview',
        name: 'DeepHermes 3 Mistral',
        description: 'Open-source deep reasoning model',
        badge: 'Open Source'
    },
    {
        id: 'jina-fallback',
        name: 'JINA AI (Legacy)',
        description: 'Simple URL extraction only - no deep research',
        badge: 'Fallback'
    }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get OpenRouter API key from environment - SAFE version
 */
function getOpenRouterApiKey(): string | null {
    try {
        // Safely access process.env
        const key = typeof process !== 'undefined' && process.env ? process.env.OPENROUTER_API_KEY : null;

        // Debug logging - remove after fixing
        console.log('[OpenRouter Debug] API Key exists:', !!key, 'Length:', key?.length || 0);

        if (!key || key === '' || key === 'undefined') {
            return null;
        }
        return key;
    } catch (e) {
        console.error('[OpenRouter Debug] Error accessing env:', e);
        // If anything fails, return null
        return null;
    }
}

/**
 * Check if OpenRouter API is available - SAFE version that never throws
 */
export function isOpenRouterAvailable(): boolean {
    try {
        const key = getOpenRouterApiKey();
        return !!key && key.length > 0;
    } catch {
        return false;
    }
}

/**
 * Retry logic with exponential backoff for API calls
 */
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number = 3,
    baseDelay: number = 2000
): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);

            // Check for rate limiting or server errors
            if (response.status === 429 || response.status === 503 || response.status === 502) {
                const delay = baseDelay * Math.pow(2, i);
                console.warn(`OpenRouter API rate limited (Attempt ${i + 1}/${retries}). Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            return response;
        } catch (error: any) {
            lastError = error;
            const delay = baseDelay * Math.pow(2, i);
            console.warn(`OpenRouter API request failed (Attempt ${i + 1}/${retries}): ${error.message}. Retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError || new Error('OpenRouter API request failed after all retries');
}

/**
 * Clean JSON from markdown code blocks
 */
function cleanJsonResponse(text: string): string {
    let clean = text.trim();
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

/**
 * Extract URLs from text as citations
 */
function extractUrlsAsCitations(text: string): Citation[] {
    const urlRegex = /https?:\/\/[^\s\])"'<>]+/g;
    const matches = text.match(urlRegex) || [];
    const uniqueUrls = [...new Set(matches)];

    return uniqueUrls.map(url => {
        // Try to extract a title from the URL
        try {
            const urlObj = new URL(url);
            return {
                uri: url,
                title: urlObj.hostname.replace('www.', '')
            };
        } catch {
            return { uri: url, title: url };
        }
    });
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Perform deep research on a topic using OpenRouter API
 */
export async function performDeepResearch(
    topic: string,
    modelId: string,
    context?: string
): Promise<OpenRouterResearchResult> {
    const apiKey = getOpenRouterApiKey();

    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not configured');
    }

    if (modelId === 'jina-fallback') {
        throw new Error('JINA fallback selected - use JINA AI instead');
    }

    const researchPrompt = `You are a meticulous research assistant. Your task is to thoroughly research the following topic and provide accurate, well-sourced information.

TOPIC TO RESEARCH:
${topic}

${context ? `ADDITIONAL CONTEXT:\n${context}\n` : ''}

RESEARCH REQUIREMENTS:
1. Provide comprehensive, factual information about the topic
2. Include specific data, statistics, and facts where available
3. Cite your sources by including URLs in your response
4. Focus on accuracy - only include information you can verify
5. Organize the information clearly with sections and bullet points
6. Include recent and up-to-date information when relevant
7. If there are conflicting sources, mention both perspectives
8. Note any areas where information is uncertain or debated

FORMAT YOUR RESPONSE AS:
- Clear sections with headers
- Bullet points for key facts
- Include source URLs in brackets [https://...]
- End with a SOURCES section listing all referenced URLs

Remember: Accuracy is more important than comprehensiveness. Only include facts you can verify.`;

    const response = await fetchWithRetry(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://link2social.app',
            'X-Title': 'Link2Social Deep Research'
        },
        body: JSON.stringify({
            model: modelId,
            messages: [
                {
                    role: 'user',
                    content: researchPrompt
                }
            ],
            temperature: 0.3, // Lower temperature for factual research
            max_tokens: 8000
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    // Extract citations from the research content
    const citations = extractUrlsAsCitations(content);

    return {
        content,
        citations,
        modelUsed: modelId
    };
}

/**
 * Verify blog facts against research sources
 * This is the critical fact-checking step to prevent hallucinations
 */
export async function verifyBlogFacts(
    blogContent: string,
    researchContent: string,
    researchCitations: Citation[],
    modelId: string
): Promise<FactCheckResult> {
    const apiKey = getOpenRouterApiKey();

    if (!apiKey) {
        // Return a warning result if API key not configured
        return {
            overallConfidence: 0.5,
            verifiedClaims: [],
            flaggedClaims: [],
            warnings: ['Fact-checking unavailable: OPENROUTER_API_KEY not configured']
        };
    }

    // Use the same model for fact-checking, or fall back to a reliable one
    const factCheckModel = modelId !== 'jina-fallback'
        ? modelId
        : 'perplexity/sonar-deep-research';

    const factCheckPrompt = `You are a meticulous fact-checker. Your job is to verify the accuracy of a blog post against the research sources provided.

BLOG CONTENT TO VERIFY:
---BEGIN BLOG---
${blogContent}
---END BLOG---

RESEARCH SOURCES (GROUND TRUTH):
---BEGIN RESEARCH---
${researchContent}
---END RESEARCH---

CITED SOURCES:
${researchCitations.map(c => `- ${c.title}: ${c.uri}`).join('\n')}

YOUR TASK:
1. Extract all factual claims from the blog content
2. Check each claim against the research sources
3. Flag any claims that:
   - Are not supported by the research
   - Contradict the research
   - Appear to be fabricated/hallucinated
   - Contain inaccurate statistics or dates
4. For flagged claims, suggest corrections based on the research

RESPOND WITH VALID JSON IN THIS EXACT FORMAT:
{
    "overallConfidence": 0.85,
    "verifiedClaims": [
        {
            "claim": "The exact claim from the blog",
            "verified": true,
            "confidence": 0.95,
            "sources": ["https://source1.com"]
        }
    ],
    "flaggedClaims": [
        {
            "claim": "The problematic claim",
            "verified": false,
            "confidence": 0.2,
            "sources": [],
            "correction": "The correct information based on research is..."
        }
    ],
    "warnings": [
        "List any general concerns about accuracy"
    ]
}

IMPORTANT:
- overallConfidence should be between 0 and 1
- Be conservative - if uncertain, flag it
- Focus on factual claims, not opinions or style
- Only include claims that can be objectively verified`;

    try {
        const response = await fetchWithRetry(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://link2social.app',
                'X-Title': 'Link2Social Fact-Checker'
            },
            body: JSON.stringify({
                model: factCheckModel,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a meticulous fact-checker. Always respond with valid JSON only, no additional text.'
                    },
                    {
                        role: 'user',
                        content: factCheckPrompt
                    }
                ],
                temperature: 0.1, // Very low temperature for factual verification
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            throw new Error(`Fact-check API error: ${response.status}`);
        }

        const result = await response.json();
        const responseText = result.choices?.[0]?.message?.content || '';

        // Parse JSON response
        const cleanedJson = cleanJsonResponse(responseText);
        const factCheckData = JSON.parse(cleanedJson);

        return {
            overallConfidence: factCheckData.overallConfidence || 0.5,
            verifiedClaims: factCheckData.verifiedClaims || [],
            flaggedClaims: factCheckData.flaggedClaims || [],
            warnings: factCheckData.warnings || []
        };
    } catch (error: any) {
        console.error('Fact-checking failed:', error);
        return {
            overallConfidence: 0.5,
            verifiedClaims: [],
            flaggedClaims: [],
            warnings: [`Fact-checking encountered an error: ${error.message}`]
        };
    }
}

/**
 * Apply corrections to blog content based on fact-check results
 */
export function applyFactCheckCorrections(
    blogContent: string,
    factCheckResult: FactCheckResult
): string {
    let correctedContent = blogContent;

    // Only apply corrections for low-confidence flagged claims
    for (const flaggedClaim of factCheckResult.flaggedClaims) {
        if (flaggedClaim.correction && flaggedClaim.confidence < 0.3) {
            // Try to find and replace the claim with the correction
            // This is a simple replacement - could be made smarter
            if (correctedContent.includes(flaggedClaim.claim)) {
                correctedContent = correctedContent.replace(
                    flaggedClaim.claim,
                    `${flaggedClaim.correction} *(corrected)*`
                );
            }
        }
    }

    return correctedContent;
}

/**
 * Convert citations to verified citations based on fact-check results
 */
export function createVerifiedCitations(
    citations: Citation[],
    factCheckResult: FactCheckResult
): VerifiedCitation[] {
    return citations.map(citation => {
        // Check if this citation was used in verified claims
        const usedInVerified = factCheckResult.verifiedClaims.some(
            claim => claim.sources.includes(citation.uri)
        );

        return {
            ...citation,
            verified: usedInVerified,
            verificationScore: usedInVerified ? factCheckResult.overallConfidence : 0.5
        };
    });
}

/**
 * Get the default research model
 */
export function getDefaultResearchModel(): OpenRouterModel {
    return DEEP_RESEARCH_MODELS[0]; // Perplexity Sonar is recommended
}
