import {useEffect, useRef} from "react";
import { schema } from './Schema'
import {EditorState} from "prosemirror-state";
import {EditorView} from "prosemirror-view";
import {keymap} from "prosemirror-keymap";
import * as Y from "yjs";
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo, redo } from 'y-prosemirror'
import { WebsocketProvider } from "y-websocket";
import "./Editor.css";
import {exampleSetup} from "prosemirror-example-setup";
import { useWebSocket } from '../contexts/WebSocketContext';
import { spellCheckPlugin } from './SpellCheckPlugin';

function Editor() {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const yDocRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    const { setProvider } = useWebSocket();

    useEffect(() => {
        if (editorRef.current && !viewRef.current) {
            // Create Yjs document
            const yDoc = new Y.Doc();
            yDocRef.current = yDoc;

            // Get the collaborative type for ProseMirror
            const type = yDoc.getXmlFragment('prosemirror');
            
            // Create WebSocket provider
            console.log('Creating WebSocket provider...');
            const provider = new WebsocketProvider('ws://localhost:8787/api/ws', 'daulet-room', yDoc);
            providerRef.current = provider;
            setProvider(provider);
            
            // Add event listeners to debug connection
            provider.on('status', ({ status }: { status: string }) => {
                console.log('WebSocket status:', status);
            });
            
            provider.on('sync', (isSynced: boolean) => {
                console.log('WebSocket synced:', isSynced);
            });
            
            provider.on('connection-error', (event: Event) => {
                console.error('WebSocket connection error:', event);
            });

            // Listen for custom messages (AI responses)
            if (provider.ws) {
                provider.ws.addEventListener('message', (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'ai-response') {
                            console.log('Received AI response:', data);
                            
                            if (data.action === 'spell-check' && data.status === 'success') {
                                // Handle spell check results
                                handleSpellCheckResults(data.results);
                            } else {
                                // Show other AI responses as alerts
                                alert(`${data.action}: ${data.message}`);
                            }
                        }
                    } catch (error) {
                        // Not a JSON message, ignore
                    }
                });
            }

            // Function to handle spell check results
            const handleSpellCheckResults = (results: any[]) => {
                console.log('Handling spell check results:', results);
                
                // Get the spell check data from Yjs
                const spellCheckData = yDoc.getMap('spellCheckData');
                
                // Store the results in the Yjs document
                spellCheckData.set('results', results);
                spellCheckData.set('timestamp', Date.now());
                
                // Show a notification
                alert(`Found ${results.length} potential spelling errors. Check the document for highlighted words.`);
            };

            // Create editor state with Yjs plugins
            const state = EditorState.create({
                schema,
                plugins: [
                    ySyncPlugin(type),
                    yCursorPlugin(provider.awareness),
                    yUndoPlugin(),
                    spellCheckPlugin(yDoc),
                    keymap({
                        'Mod-z': undo,
                        'Mod-y': redo,
                        'Mod-Shift-z': redo
                    })
                ].concat(exampleSetup({ schema })),
            });

            viewRef.current = new EditorView(editorRef.current, { state });
        }

        // Cleanup function to destroy the editor view when component unmounts
        return () => {
            if (viewRef.current) {
                viewRef.current.destroy();
                viewRef.current = null;
            }
            if (providerRef.current) {
                providerRef.current.destroy();
                providerRef.current = null;
            }
            if (yDocRef.current) {
                yDocRef.current.destroy();
                yDocRef.current = null;
            }
            setProvider(null);
        };
    }, []);

    return <div className="w-full h-full p-4" ref={editorRef} />;
}

export default Editor;