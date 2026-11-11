import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';

/**
 * Block anchors for the Docs pages: every block of these types carries a `blockId`, the anchor comment threads and
 * `?block=` links point at. The attribute, its name and its UUID form are the platform's (the same anchor its own
 * Docs editor writes, which its schema accepts on every node and checks as a UUID), so a page keeps its anchors
 * whichever editor saves it. The editor gives a block without one (new, pasted, split) its own after each edit, and a
 * second block with the same anchor (a copy) a new one.
 */
export const BLOCK_ID_ATTRIBUTE = 'blockId';

/** The blocks that are anchored, as the platform's editor anchors them (the types this editor has). */
export const BLOCK_ID_TYPES: readonly string[] = ['heading', 'paragraph', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'taskList', 'image'];

const BLOCK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The meta of the live binding's transactions (y-prosemirror's `ySyncPluginKey`): edits of the others. */
const LIVE_SYNC_META = 'y-sync$';

export const blockIdPluginKey = new PluginKey('docsBlockIds');

export function isBlockId(value: unknown): value is string {
	return typeof value === 'string' && BLOCK_ID_PATTERN.test(value);
}

/** A new anchor: a version 4 UUID, which the platform's schema requires. */
export function newBlockId(): string {
	const cryptoApi = typeof globalThis.crypto === 'undefined' ? undefined : globalThis.crypto;
	if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
	const bytes = new Uint8Array(16);
	if (typeof cryptoApi?.getRandomValues === 'function') {
		cryptoApi.getRandomValues(bytes);
	} else {
		for (let at = 0; at < bytes.length; at += 1) bytes[at] = Math.floor(Math.random() * 256);
	}
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The blocks of a document that need an anchor (none, not a UUID, or one an earlier block already has), in order. */
export function blocksWithoutAnchor(doc: ProseMirrorNode, types: ReadonlySet<string>): number[] {
	const seen = new Set<string>();
	const positions: number[] = [];
	doc.descendants((node, pos) => {
		if (!types.has(node.type.name)) return true;
		const id = node.attrs[BLOCK_ID_ATTRIBUTE];
		if (isBlockId(id) && !seen.has(id)) {
			seen.add(id);
		} else {
			positions.push(pos);
		}
		return true;
	});
	return positions;
}

/** Every anchor of a document, in reading order. */
export function blockIdsOf(doc: ProseMirrorNode): string[] {
	const ids: string[] = [];
	doc.descendants((node) => {
		const id = node.attrs[BLOCK_ID_ATTRIBUTE];
		if (isBlockId(id)) ids.push(id);
		return true;
	});
	return ids;
}

/** Where a block is, and its text, by its anchor; null when no block of the document has it. */
export function blockOf(doc: ProseMirrorNode, blockId: string): { pos: number; node: ProseMirrorNode } | null {
	let found: { pos: number; node: ProseMirrorNode } | null = null;
	doc.descendants((node, pos) => {
		if (found) return false;
		if (node.attrs[BLOCK_ID_ATTRIBUTE] === blockId) {
			found = { pos, node };
			return false;
		}
		return true;
	});
	return found;
}

/** The innermost anchored block around the selection's start: its position and its anchor (null when it has none yet). */
export function blockAtSelection(state: EditorState, types: ReadonlySet<string> = new Set(BLOCK_ID_TYPES)): { pos: number; node: ProseMirrorNode; blockId: string | null } | null {
	const { $from } = state.selection;
	for (let depth = $from.depth; depth > 0; depth -= 1) {
		const node = $from.node(depth);
		if (types.has(node.type.name)) {
			const id = node.attrs[BLOCK_ID_ATTRIBUTE];
			return { pos: $from.before(depth), node, blockId: isBlockId(id) ? id : null };
		}
	}
	// A selected image (a node selection) is a block of its own.
	const selected = (state.selection as { node?: ProseMirrorNode }).node;
	if (selected && types.has(selected.type.name)) {
		const id = selected.attrs[BLOCK_ID_ATTRIBUTE];
		return { pos: state.selection.from, node: selected, blockId: isBlockId(id) ? id : null };
	}
	return null;
}

/** Gives the listed blocks new anchors in `transaction`; answers whether it changed anything. */
function stampAnchors(transaction: Transaction, positions: readonly number[]): boolean {
	for (const pos of positions) transaction.setNodeAttribute(pos, BLOCK_ID_ATTRIBUTE, newBlockId());
	return positions.length > 0;
}

/** Answers a transaction that gives the selection's block its anchor (when it has none), and the anchor. */
export function anchorSelectionBlock(state: EditorState): { blockId: string; transaction: Transaction | null } | null {
	const block = blockAtSelection(state);
	if (!block) return null;
	if (block.blockId) return { blockId: block.blockId, transaction: null };
	const blockId = newBlockId();
	const transaction = state.tr.setNodeAttribute(block.pos, BLOCK_ID_ATTRIBUTE, blockId).setMeta('addToHistory', false);
	return { blockId, transaction };
}

export const BlockIds = Extension.create({
	name: 'docsBlockIds',

	addGlobalAttributes() {
		return [
			{
				types: [...BLOCK_ID_TYPES],
				attributes: {
					[BLOCK_ID_ATTRIBUTE]: {
						default: null,
						// A split block is a new block: it gets an anchor of its own.
						keepOnSplit: false,
						// `data-blockid` is what the platform's editor writes (its attribute name lower-cased by HTML).
						parseHTML: (element: HTMLElement) => element.getAttribute('data-block-id') ?? element.getAttribute('data-blockid'),
						renderHTML: (attributes: Record<string, unknown>) =>
							isBlockId(attributes[BLOCK_ID_ATTRIBUTE]) ? { 'data-block-id': attributes[BLOCK_ID_ATTRIBUTE] as string } : {}
					}
				}
			}
		];
	},

	addProseMirrorPlugins() {
		const types = new Set(BLOCK_ID_TYPES);
		return [
			new Plugin({
				key: blockIdPluginKey,
				appendTransaction: (transactions, _previous, state) => {
					// After an edit made here; the others' edits (live) come anchored by the editor that made them.
					const edited = transactions.some((transaction) => transaction.docChanged && !transaction.getMeta(LIVE_SYNC_META) && !transaction.getMeta(blockIdPluginKey));
					if (!edited) return null;
					const transaction = state.tr.setMeta(blockIdPluginKey, true).setMeta('addToHistory', false);
					return stampAnchors(transaction, blocksWithoutAnchor(state.doc, types)) ? transaction : null;
				}
			})
		];
	}
});
