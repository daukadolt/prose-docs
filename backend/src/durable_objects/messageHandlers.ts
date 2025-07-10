import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness.js";
import * as syncProtocol from "y-protocols/sync.js";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { AIRequest, AIResponse, messageSync, messageAwareness, DocumentState, TextChange, SpellCheckResult } from './types';
import { SpellCheckService } from './spellCheckService';
import { DocumentChangeTracker } from './documentChangeTracker';

export class MessageHandlers {
    constructor(
        private yDoc: Y.Doc,
        private awareness: awarenessProtocol.Awareness,
        private connections: Set<WebSocket>,
        private spellCheckService: SpellCheckService,
        private documentTracker: DocumentChangeTracker
    ) {}

    async handleTextMessage(ws: WebSocket, message: string): Promise<boolean> {
        // Handle ping/pong
        if (message === 'ping') {
            ws.send('pong');
            return true;
        }
        
        // Try to parse as JSON for custom messages
        try {
            const jsonMessage = JSON.parse(message) as AIRequest;
            if (jsonMessage.type === 'ai-request') {
                console.log('Received AI request:', jsonMessage);
                await this.handleAIRequest(ws, jsonMessage);
                return true;
            }
        } catch (error) {
            // Not a JSON message, continue with binary message handling
            console.log('Message is not JSON, treating as binary');
        }
        
        return false;
    }

    async handleBinaryMessage(ws: WebSocket, message: ArrayBuffer): Promise<void> {
        const isNewConnection = !this.connections.has(ws);
        if (isNewConnection) {
            this.connections.add(ws);
            console.log('Durable Object: New connection added, total connections:', this.connections.size);

            // Send sync step 1 to new connection
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            syncProtocol.writeSyncStep1(encoder, this.yDoc);
            ws.send(encoding.toUint8Array(encoder));

            // Send current awareness states
            const awarenessStates = this.awareness.getStates();
            if (awarenessStates.size > 0) {
                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, messageAwareness);
                encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(awarenessStates.keys())));
                ws.send(encoding.toUint8Array(encoder));
            }
        }

        try {
            // Parse the message
            const decoder = decoding.createDecoder(new Uint8Array(message));
            const messageType = decoding.readVarUint(decoder);

            switch (messageType) {
                case messageSync: {
                    const encoder = encoding.createEncoder();
                    encoding.writeVarUint(encoder, messageSync);
                    syncProtocol.readSyncMessage(decoder, encoder, this.yDoc, ws);

                    if (encoding.length(encoder) > 1) {
                        ws.send(encoding.toUint8Array(encoder));
                    }
                    break;
                }
                case messageAwareness: {
                    const update = decoding.readVarUint8Array(decoder);
                    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, ws);
                    break;
                }
                default:
                    console.warn('Durable Object: Unknown message type:', messageType);
            }
        } catch (error) {
            console.error('Durable Object: Error processing message:', error);
        }
    }

    private async handleAIRequest(ws: WebSocket, request: AIRequest): Promise<void> {
        switch (request.action) {
            case 'spell-check':
                console.log('Processing spell check request');
                await this.handleSpellCheckRequest(ws);
                break;
            case 'fact-check':
                console.log('Processing fact check request');
                await this.handleFactCheckRequest(ws);
                break;
            default:
                console.warn('Unknown AI action:', request.action);
                ws.send(JSON.stringify(this.spellCheckService.createErrorResponse(
                    request.action, 
                    'Unknown action requested'
                )));
        }
    }

    private async handleSpellCheckRequest(ws: WebSocket): Promise<void> {
        try {
            // Get the current document content
            const xmlFragment = this.yDoc.getXmlFragment('prosemirror');
            const content = xmlFragment.toString();
            
            console.log('Raw XML content from ProseMirror:', content);
            
            if (!content.trim()) {
                ws.send(JSON.stringify(this.spellCheckService.createErrorResponse(
                    'spell-check', 
                    'No content to spell check'
                )));
                return;
            }

            // Perform full spell check on the entire content
            await this.handleFullSpellCheck(ws, content);

        } catch (error) {
            console.error('Error during spell check:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            ws.send(JSON.stringify(this.spellCheckService.createErrorResponse(
                'spell-check', 
                'Failed to perform spell check: ' + errorMessage
            )));
        }
    }

    private async handleFullSpellCheck(ws: WebSocket, content: string): Promise<void> {
        const spellCheckResults = await this.spellCheckService.performSpellCheck(content);
        
        if (spellCheckResults.length === 0) {
            ws.send(JSON.stringify(this.spellCheckService.createSuccessResponse(
                'spell-check', 
                []
            )));
            return;
        }

        // Apply spell check highlights to the Yjs document
        await this.applySpellCheckHighlights(spellCheckResults);

        // Send success response
        ws.send(JSON.stringify(this.spellCheckService.createSuccessResponse(
            'spell-check', 
            spellCheckResults
        )));
    }



    private async handleFactCheckRequest(ws: WebSocket): Promise<void> {
        // TODO: Implement fact check logic
        ws.send(JSON.stringify(this.spellCheckService.createProcessingResponse(
            'fact-check',
            'Fact check request received and being processed'
        )));
    }

    private async applySpellCheckHighlights(spellCheckResults: SpellCheckResult[]): Promise<void> {
        // Get the XML fragment for ProseMirror
        const xmlFragment = this.yDoc.getXmlFragment('prosemirror');
        
        // Create a new XML element to store spell check data
        const spellCheckData = this.yDoc.getMap('spellCheckData');
        
        // Store the spell check results
        spellCheckData.set('results', spellCheckResults);
        spellCheckData.set('timestamp', Date.now());
        
        // Trigger a document update to propagate changes
        // Note: We don't need to manually emit update as the map.set() will trigger it
    }
} 