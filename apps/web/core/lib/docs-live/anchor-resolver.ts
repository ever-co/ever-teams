import * as Y from 'yjs';
import type { DocsLiveAnchorPoint, DocsLiveAnchorResolver } from '@/core/lib/utils/docs-comment-anchors';
import { DOCS_LIVE_FIELD } from './config';
import { fromBase64, toBase64 } from './protocol';

/**
 * The live relative positions of comment anchors in a page's shared document (the fragment the editors bind, as the
 * platform reads it): a relative position follows every concurrent edit, so a live page finds a range by it first.
 * The same walk as the platform's, so a position is read alike in the editor, the panel and on the platform.
 */

/** A node of the shared fragment the editors bind: the fragment, an element, or a text. */
type LiveNode = Y.XmlFragment | Y.XmlElement | Y.XmlText;

function isLiveNode(value: unknown): value is LiveNode {
	return value instanceof Y.XmlFragment || value instanceof Y.XmlElement || value instanceof Y.XmlText;
}

/** Whether a node is the fragment or under it. */
function isInside(type: LiveNode, fragment: Y.XmlFragment): boolean {
	for (let current: LiveNode | null = type; current; current = parentOf(current)) {
		if (current === fragment) return true;
	}
	return false;
}

function parentOf(type: LiveNode): LiveNode | null {
	const parent = (type as unknown as { parent?: unknown }).parent;
	return isLiveNode(parent) ? parent : null;
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
function pointOf(type: LiveNode, index: number): DocsLiveAnchorPoint | null {
	let offset = 0;
	if (type instanceof Y.XmlText) {
		offset = Math.max(0, Math.min(index, type.length));
	} else if (type instanceof Y.XmlElement || type instanceof Y.XmlFragment) {
		const children = type.toArray();
		for (let at = 0; at < Math.min(index, children.length); at += 1) offset += liveTextLength(children[at]);
	} else {
		return null;
	}
	let node: LiveNode = type;
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
		const type: unknown = absolute?.type;
		if (!absolute || !isLiveNode(type) || !isInside(type, fragment)) return null;
		return pointOf(type, absolute.index);
	};
}

/** A relative position as an anchor stores it (base64 of `Y.encodeRelativePosition`). */
export function encodeLiveAnchorPosition(position: Y.RelativePosition): string {
	return toBase64(Y.encodeRelativePosition(position));
}
