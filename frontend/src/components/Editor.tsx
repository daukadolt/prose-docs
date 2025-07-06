import {useEffect, useRef} from "react";
import { schema } from './Schema'
import {EditorState} from "prosemirror-state";
import {EditorView} from "prosemirror-view";
import {keymap} from "prosemirror-keymap";
import * as Y from "yjs";
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo, redo } from 'y-prosemirror'
import { WebsocketProvider } from "y-websocket";

function Editor() {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const yDocRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);

    useEffect(() => {
        if (editorRef.current && !viewRef.current) {
            // Create Yjs document
            const yDoc = new Y.Doc();
            yDocRef.current = yDoc;
            
            // Get the collaborative type for ProseMirror
            const type = yDoc.getXmlFragment('prosemirror');
            
            // Create WebSocket provider
            const provider = new WebsocketProvider('wss://demos.yjs.dev/ws', 'prosemirror', yDoc);
            providerRef.current = provider;

            // Create editor state with Yjs plugins
            const state = EditorState.create({
                schema,
                plugins: [
                    ySyncPlugin(type),
                    yCursorPlugin(provider.awareness),
                    yUndoPlugin(),
                    keymap({
                        'Mod-z': undo,
                        'Mod-y': redo,
                        'Mod-Shift-z': redo
                    })
                ],
            });

            // Create editor view
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
        };
    }, []);

    return <div className="w-full h-full p-4" ref={editorRef} />;
}

export default Editor;