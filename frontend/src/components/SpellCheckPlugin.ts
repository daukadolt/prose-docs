import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import * as Y from 'yjs';

interface SpellCheckResult {
    word: string;
    suggestions: string[];
    position: number;
    length: number;
}

export function spellCheckPlugin(yDoc: Y.Doc) {
    let view: EditorView | null = null;

    // Listen for changes to spell check data in Yjs and force a re-render
    const spellCheckData = yDoc.getMap('spellCheckData');
    const observer = () => {
        if (view) {
            // Force a re-render by dispatching a transaction
            view.dispatch(view.state.tr);
        }
    };
    spellCheckData.observe(observer);

    return new Plugin({
        view(editorView) {
            view = editorView;
            return {
                destroy() {
                    view = null;
                    spellCheckData.unobserve(observer);
                }
            };
        },
        state: {
            init() {
                return DecorationSet.empty;
            },
            apply(tr, oldState) {
                // Always clear previous highlights and use latest results
                const results = spellCheckData.get('results') as SpellCheckResult[] || [];
                if (!results.length) return DecorationSet.empty;

                const decorations: Decoration[] = [];
                const doc = tr.doc;

                results.forEach((result) => {
                    try {
                        const pos = Math.min(result.position, doc.content.size);
                        decorations.push(
                            Decoration.inline(
                                pos,
                                pos + result.length,
                                {
                                    class: 'spell-check-error',
                                    'data-suggestions': JSON.stringify(result.suggestions),
                                    'data-original-word': result.word
                                }
                            )
                        );
                    } catch (error) {
                        console.error('Error creating decoration for spell check result:', error);
                    }
                });

                return DecorationSet.create(doc, decorations);
            }
        },
        props: {
            decorations(state) {
                return this.getState(state);
            }
        }
    });
} 