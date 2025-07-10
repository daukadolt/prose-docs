import { DurableObject } from "cloudflare:workers";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness.js";
import * as syncProtocol from "y-protocols/sync.js";
import * as encoding from "lib0/encoding";
import { messageSync, messageAwareness } from './types';
import { SpellCheckService } from './spellCheckService';
import { DocumentChangeTracker } from './documentChangeTracker';
import { MessageHandlers } from './messageHandlers';

export class DocumentHibernationServer extends DurableObject<CloudflareBindings> {
    private yDoc = new Y.Doc();
    private connections = new Set<WebSocket>();
    private awareness = new awarenessProtocol.Awareness(this.yDoc);
    private spellCheckService: SpellCheckService;
    private documentTracker: DocumentChangeTracker;
    private messageHandlers: MessageHandlers;

    constructor(ctx: DurableObjectState, env: CloudflareBindings) {
        super(ctx, env);
        this.spellCheckService = new SpellCheckService(env);
        this.documentTracker = new DocumentChangeTracker();
        this.messageHandlers = new MessageHandlers(
            this.yDoc,
            this.awareness,
            this.connections,
            this.spellCheckService,
            this.documentTracker
        );
        this.setupDocument();
    }

    private setupDocument() {
        // Set up awareness change handler
        this.awareness.on('update', ({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }) => {
            const changedClients = added.concat(updated, removed);
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageAwareness);
            encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients));
            const message = encoding.toUint8Array(encoder);
            
            // Broadcast awareness update to all connections
            for (const conn of this.connections) {
                if (conn.readyState === WebSocket.READY_STATE_OPEN) {
                    conn.send(message);
                }
            }
        });

        // Set up document update handler
        this.yDoc.on('update', (update: Uint8Array, origin: any) => {
            // Track document changes for incremental spell checking
            this.trackDocumentChange();
            
            // Broadcast document updates to all other connections
            for (const conn of this.connections) {
                if (conn !== origin && conn.readyState === WebSocket.READY_STATE_OPEN) {
                    const encoder = encoding.createEncoder();
                    encoding.writeVarUint(encoder, messageSync);
                    syncProtocol.writeUpdate(encoder, update);
                    const message = encoding.toUint8Array(encoder);
                    conn.send(message);
                }
            }
        });
    }

    private trackDocumentChange() {
        // Get current document content and track changes
        const xmlFragment = this.yDoc.getXmlFragment('prosemirror');
        const content = xmlFragment.toString();
        this.documentTracker.trackDocumentChange(content);
    }

    async fetch(request: Request) {
        console.log('Durable Object: WebSocket connection request received');
        
        // Creates two ends of a WebSocket connection.
        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);

        // Accept the WebSocket connection
        this.ctx.acceptWebSocket(server);

        console.log('Durable Object: WebSocket connection accepted');
        
        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
        console.log('Durable Object: Received message:', typeof message, message);

        // Handle text messages (ping/pong and custom JSON messages)
        if (typeof message === 'string') {
            const handled = await this.messageHandlers.handleTextMessage(ws, message);
            if (handled) {
                return;
            }
        }

        // Handle binary messages (Yjs protocol)
        if (message instanceof ArrayBuffer) {
            await this.messageHandlers.handleBinaryMessage(ws, message);
        }
    }

    async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
        console.log('Durable Object: WebSocket closing with code:', code, 'reason:', reason, 'wasClean:', wasClean);
        
        // Remove from connections set
        this.connections.delete(ws);
        
        // Remove awareness states for this connection
        awarenessProtocol.removeAwarenessStates(this.awareness, [], ws);
    }
}