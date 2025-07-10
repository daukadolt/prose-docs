export interface SpellCheckResult {
    word: string;
    suggestions: string[];
    position: number;
    length: number;
}

export interface CacheEntry {
    results: SpellCheckResult[];
    timestamp: number;
    contentHash: string;
}

export interface ContentCache {
    [contentHash: string]: CacheEntry;
}

export interface TextChange {
    position: number;
    deletedText: string;
    insertedText: string;
    deletedLength: number;
    insertedLength: number;
}

export interface DocumentState {
    content: string;
    results: SpellCheckResult[];
    timestamp: number;
}

export interface AIRequest {
    type: 'ai-request';
    action: 'spell-check' | 'fact-check';
    [key: string]: any;
}

export interface AIResponse {
    type: 'ai-response';
    action: string;
    status: 'success' | 'error' | 'processing';
    message: string;
    results?: SpellCheckResult[];
}

export const messageSync = 0;
export const messageAwareness = 1; 