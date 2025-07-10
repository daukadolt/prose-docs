import { TextChange, DocumentState, SpellCheckResult } from './types';

export class DocumentChangeTracker {
    private currentDocumentState: DocumentState | null = null;
    private pendingChanges: TextChange[] = [];

    trackDocumentChange(content: string) {
        if (this.currentDocumentState) {
            // Calculate changes by comparing with previous state
            const changes = this.calculateTextChanges(this.currentDocumentState.content, content);
            this.pendingChanges.push(...changes);
            
            console.log(`Document changed: ${changes.length} change(s) detected`);
        }
        
        // Update current document state
        this.currentDocumentState = {
            content,
            results: this.currentDocumentState?.results || [],
            timestamp: Date.now()
        };
    }

    getCurrentDocumentState(): DocumentState | null {
        return this.currentDocumentState;
    }

    getPendingChanges(): TextChange[] {
        return this.pendingChanges;
    }

    clearPendingChanges() {
        this.pendingChanges = [];
    }

    updateDocumentResults(results: SpellCheckResult[]) {
        if (this.currentDocumentState) {
            this.currentDocumentState.results = results;
        }
    }

    private calculateTextChanges(oldContent: string, newContent: string): TextChange[] {
        const changes: TextChange[] = [];
        
        // Simple diff algorithm - find first and last different characters
        let startDiff = 0;
        let endDiff = Math.min(oldContent.length, newContent.length);
        
        // Find first difference
        while (startDiff < endDiff && oldContent[startDiff] === newContent[startDiff]) {
            startDiff++;
        }
        
        // Find last difference
        while (endDiff > startDiff && oldContent[endDiff - 1] === newContent[endDiff - 1]) {
            endDiff--;
        }
        
        if (startDiff < endDiff || oldContent.length !== newContent.length) {
            const deletedText = oldContent.substring(startDiff, endDiff);
            const insertedText = newContent.substring(startDiff, endDiff);
            
            changes.push({
                position: startDiff,
                deletedText,
                insertedText,
                deletedLength: deletedText.length,
                insertedLength: insertedText.length
            });
        }
        
        return changes;
    }

    processIncrementalSpellCheck(
        currentResults: SpellCheckResult[], 
        pendingChanges: TextChange[]
    ): SpellCheckResult[] {
        let newResults = [...currentResults];
        
        // Process each change
        for (const change of pendingChanges) {
            // Remove results that are affected by the change
            newResults = newResults.filter(result => {
                const resultEnd = result.position + result.length;
                const changeEnd = change.position + change.insertedLength;
                
                // Remove if result overlaps with changed region
                return !(result.position < changeEnd && resultEnd > change.position);
            });
            
            // Adjust positions of results after the change
            newResults = newResults.map(result => {
                if (result.position > change.position) {
                    const positionAdjustment = change.insertedLength - change.deletedLength;
                    return {
                        ...result,
                        position: result.position + positionAdjustment
                    };
                }
                return result;
            });
        }
        
        return newResults;
    }
} 