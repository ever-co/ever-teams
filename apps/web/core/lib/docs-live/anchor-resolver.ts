import * as Y from 'yjs';
import type { DocsLiveAnchorPoint, DocsLiveAnchorResolver } from '@/core/lib/utils/docs-comment-anchors';
import { DOCS_LIVE_FIELD } from './config';
import { fromBase64, toBase64 } from './protocol';

/**
 * The live relative positions of comment anchors in a page's shared document (the fragment the editors bind, as the
 * platform reads it): a relative position follows every concurrent edit, so a live page finds a range by it first.
 * The same walk as the platform's, so a position is read alike in the editor, the panel and on the platform.
 */

/** Whether a type is the fragment or under it. */
function isInside(type: Y.AbstractType<unknown>, fragment: Y.XmlFragment): boolean {
	for (let current: Y.AbstractType<unknown> | null = type; current; current = parentOf(current)) {
		if (current === fragment) return true;
	}
	return false;
}

function parentOf(type: Y.AbstractType<unknown>): Y.AbstractType<unknown> | null {
	const parent = (type as unknown as { parent?: Y.AbstractType<unknown> | null }).parent;
	return parent ?? null;
}

/** The text length of a node, as the anchors count it: a text's characters, an element's children's. */
function liveTextLength(type: unknown): number {
	if (type instanceof Y.XmlText) return type.length;
	if (type instanceof Y.XmlElement || type instanceof Y.XmlFragment) {
		let length = 0;
		for (const child of type.toArray()) length += liveTextLength(child);
		return length;
	}
	return 0;
}

/** The block and offset of `(type, index)`: the nearest element with a `blockId` above it, and the text before it there. */
function pointOf(type: Y.AbstractType<unknown>, index: number): DocsLiveAnchorPoint | null {
	let offset = 0;
	if (type instanceof Y.XmlText) {
		offset = Math.max(0, Math.min(index, type.length));
	} else if (type instanceof Y.XmlElement || type instanceof Y.XmlFragment) {
		const children = type.toArray();
		for (let at = 0; at < Math.min(index, children.length); at += 1) offset += liveTextLength(children[at]);
	} else {
		return null;
	}
	let node: Y.AbstractType<unknown> = type;
	for (;;) {
		if (node instanceof Y.XmlElement) {
			const blockId = node.getAttribute('blockId');
			if (typeof blockId === 'string' && blockId.length > 0) return { blockId, offset };
		}
		const parent = parentOf(node);
		if (!parent || !(parent instanceof Y.XmlElement || parent instanceof Y.XmlFragment)) return null;
		for (const sibling of parent.toArray()) {
			if (sibling === node) break;
			offset += liveTextLength(sibling);
		}
		node = parent;
	}
}

/**
 * The reader of relative positions in a page's shared document. A position the document does not hold yet, one that
 * is in no block with a `blockId`, or a value that is no relative position, reads as `null`.
 */
export function liveAnchorResolverOf(doc: Y.Doc, field = DOCS_LIVE_FIELD): DocsLiveAnchorResolver {
	const fragment = doc.getXmlFragment(field);
	return (relative: string): DocsLiveAnchorPoint | null => {
		const bytes = fromBase64(relative);
		if (!bytes || bytes.length === 0) return null;
		let absolute: Y.AbsolutePosition | null = null;
		try {
			absolute = Y.createAbsolutePositionFromRelativePosition(Y.decodeRelativePosition(bytes), doc);
		} catch {
			return null;
		}
		if (!absolute || !isInside(absolute.type as Y.AbstractType<unknown>, fragment)) return null;
		return pointOf(absolute.type as Y.AbstractType<unknown>, absolute.index);
	};
}

/** A relative position as an anchor stores it (base64 of `Y.encodeRelativePosition`). */
export function encodeLiveAnchorPosition(position: Y.RelativePosition): string {
	return toBase64(Y.encodeRelativePosition(position));
}
