// cspell:ignore Prosemirror
import { generateHTML, type Extensions, type JSONContent } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import { yXmlFragmentToProsemirrorJSON } from '@tiptap/y-tiptap';
import type { Awareness } from 'y-protocols/awareness';
import type { Doc } from 'yjs';
import { schemaExtensions, type EditorCollaboration } from './editor-extensions';
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

/**
 * What a live document holds, as the page stores it: the editor's JSON and the HTML rendered from it. Read when live
 * editing stopped with edits the platform never confirmed, so they become the autosave's draft (also when no editor
 * was bound to the document yet).
 *
 * @param document The session's shared document.
 * @param field Its fragment.
 */
export function liveDocumentContent(document: Doc, field = 'default'): { json: JSONContent; html: string } {
	const json = yXmlFragmentToProsemirrorJSON(document.getXmlFragment(field)) as JSONContent;
	try {
		return { json, html: generateHTML(json, schemaExtensions()) };
	} catch {
		// A node this editor's schema does not know: the JSON is kept whole (it is what the page stores), and the HTML is
		// its text, a paragraph per block, so nothing of the edits is lost to the schema.
		return { json, html: plainHtmlOf(json) };
	}
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function textOf(node: JSONContent): string {
	if (typeof node.text === 'string') return node.text;
	return (node.content ?? []).map(textOf).join(node.type === 'doc' ? '\n' : '');
}

/** The text of each top-level block as a paragraph, escaped. */
function plainHtmlOf(json: JSONContent): string {
	return (json.content ?? [])
		.map((block) => `<p>${textOf(block).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])}</p>`)
		.join('');
}
