import type { Extensions } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import type { Awareness } from 'y-protocols/awareness';
import type { Doc } from 'yjs';
import type { EditorCollaboration } from './editor-extensions';
import { LiveCaret } from './live-caret-extension';

/**
 * What binds an editor to a live page: TipTap's `Collaboration` on the shared document's fragment (the editor's text
 * is the document's, and its history the document's own) and the co-editors' carets from the session's awareness.
 * In a module of its own, so only the live pages load the Yjs binding.
 *
 * @param document The session's shared document, empty until the platform's state arrived in it.
 * @param awareness The session's awareness (cursors and presence).
 * @param field The fragment the platform shares with every editor (TipTap's default).
 */
export function liveCollaboration(document: Doc, awareness: Awareness, field = 'default'): EditorCollaboration {
	const extensions: Extensions = [Collaboration.configure({ document, field }), LiveCaret.configure({ awareness })];
	return { extensions };
}
