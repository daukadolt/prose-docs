import { SpellCheckResult, CacheEntry, ContentCache, AIResponse } from './types';

export class SpellCheckService {
    private spellCheckCache: ContentCache = {};

    constructor(private env: CloudflareBindings) {}

    async performSpellCheck(content: string): Promise<SpellCheckResult[]> {
        if (!content.trim()) {
            return [];
        }

        // Generate content hash for caching
        const contentHash = this.generateContentHash(content);
        console.log('Content hash:', contentHash);
        
        // Check if we have cached results for this content
        const cachedResults = this.getCachedSpellCheckResults(contentHash);
        if (cachedResults) {
            console.log('🎯 CACHE HIT! Using cached spell check results');
            return cachedResults;
        }

        console.log('❌ CACHE MISS! Calling AI for spell check');

        // Call OpenAI for spell checking
        const spellCheckResults = await this.callAISpellCheck(content);
        
        console.log('📝 Final spell check results:', spellCheckResults);

        // Cache the results
        this.cacheSpellCheckResults(contentHash, spellCheckResults);

        return spellCheckResults;
    }

    private async callAISpellCheck(content: string): Promise<SpellCheckResult[]> {
        // Clean the content by removing XML/HTML tags and extracting plain text
        const cleanContent = this.cleanContentForSpellCheck(content);
        
        if (!cleanContent.trim()) {
            console.log('No clean text content found for spell checking');
            return [];
        }

        console.log('Cleaned content for spell check:', cleanContent);

        const spellCheckPrompt = `Analyze the following plain text for spelling errors. Return ONLY a valid JSON array of objects with this exact structure for each misspelled word:

[
  {
    "word": "misspelled_word",
    "suggestions": ["suggestion1", "suggestion2"],
    "position": 0,
    "length": 10
  }
]

Text to analyze: "${cleanContent}"

IMPORTANT: Return ONLY the JSON array, no other text, no explanations, no markdown formatting.`;

        const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            prompt: spellCheckPrompt,
            max_tokens: 1000,
            temperature: 0.1
        });

        const result = response as any;
        console.log('🤖 AI Spell Check Response:', result.response);
        
        let spellCheckResults: SpellCheckResult[] = [];

        try {
            // Try to parse the response as JSON
            const jsonResponse = JSON.parse(result.response);
            if (Array.isArray(jsonResponse)) {
                spellCheckResults = jsonResponse;
                console.log('✅ Successfully parsed AI response:', spellCheckResults);
            } else {
                console.log('❌ AI response is not an array:', jsonResponse);
            }
        } catch (parseError) {
            console.error('❌ Failed to parse AI response as JSON:', result.response);
            console.error('Parse error:', parseError);
            // Simple fallback: return empty results if parsing fails
            spellCheckResults = [];
        }

        return spellCheckResults;
    }

    private cleanContentForSpellCheck(content: string): string {
        console.log('Cleaning content for spell check. Original:', content);
        
        // Remove XML/HTML tags
        let cleanContent = content.replace(/<[^>]*>/g, ' ');
        
        // Remove extra whitespace
        cleanContent = cleanContent.replace(/\s+/g, ' ').trim();
        
        // Remove any remaining special characters that might confuse the AI
        // Keep letters, numbers, spaces, and basic punctuation
        cleanContent = cleanContent.replace(/[^\w\s.,!?;:'"()-]/g, ' ');
        
        // Clean up multiple spaces again
        cleanContent = cleanContent.replace(/\s+/g, ' ').trim();
        
        console.log('Cleaned content:', cleanContent);
        
        return cleanContent;
    }

    createSuccessResponse(action: string, results: SpellCheckResult[]): AIResponse {
        return {
            type: 'ai-response',
            action,
            status: 'success',
            message: `Found ${results.length} potential spelling errors`,
            results
        };
    }

    createErrorResponse(action: string, message: string): AIResponse {
        return {
            type: 'ai-response',
            action,
            status: 'error',
            message
        };
    }

    createProcessingResponse(action: string, message: string): AIResponse {
        return {
            type: 'ai-response',
            action,
            status: 'processing',
            message
        };
    }

    invalidateCache() {
        // Clear the cache when document changes
        this.spellCheckCache = {};
        console.log('Spell check cache invalidated due to document changes');
    }

    private generateContentHash(content: string): string {
        // Simple hash function for content
        let hash = 0;
        if (content.length === 0) return hash.toString();
        
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    private getCachedSpellCheckResults(contentHash: string): SpellCheckResult[] | null {
        const cacheEntry = this.spellCheckCache[contentHash];
        if (!cacheEntry) {
            return null;
        }

        // Check if cache is still valid (within 1 hour)
        const cacheAge = Date.now() - cacheEntry.timestamp;
        const maxCacheAge = 60 * 60 * 1000; // 1 hour

        if (cacheAge > maxCacheAge) {
            console.log('Spell check cache expired, removing old entry');
            delete this.spellCheckCache[contentHash];
            return null;
        }

        console.log('Using cached spell check results');
        return cacheEntry.results;
    }

    private cacheSpellCheckResults(contentHash: string, results: SpellCheckResult[]) {
        this.spellCheckCache[contentHash] = {
            results,
            timestamp: Date.now(),
            contentHash
        };
        console.log('Cached spell check results for content hash:', contentHash);
    }
} 