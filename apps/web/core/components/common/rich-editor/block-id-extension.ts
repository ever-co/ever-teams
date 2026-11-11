import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Mapping } from '@tiptap/pm/transform';

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

/** The meta of the live binding's transactions (the Yjs binding's sync plugin key): edits of the others. */
const LIVE_SYNC_META = 'y-sync$';

export const blockIdPluginKey = new PluginKey('docsBlockIds');

export function isBlockId(value: unknown): value is string {
	return typeof value === 'string' && BLOCK_ID_PATTERN.test(value);
}

/** A new anchor: a version 4 UUID, which the platform's schema requires, from the browser's cryptographic source. */
export function newBlockId(): string {
	const cryptoApi = globalThis.crypto;
	if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
	// `randomUUID` needs a secure context (https or localhost); `getRandomValues` does not.
	const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The blocks of a document that need an anchor, in order: none, one that is no UUID, or one another block has too (a
 * copy). Of the blocks sharing an anchor, the one at `keeperOf(anchor)` keeps it (the block that had it before the
 * edit, so its threads and links stay on it); without one there, the first does.
 */
export function blocksWithoutAnchor(doc: ProseMirrorNode, types: ReadonlySet<string>, keeperOf: (blockId: string) => number | null = () => null): number[] {
	const anchored: Array<{ pos: number; id: string | null }> = [];
	const count = new Map<string, number>();
	doc.descendants((node, pos) => {
		if (!types.has(node.type.name)) return;
		const id = node.attrs[BLOCK_ID_ATTRIBUTE];
		const valid = isBlockId(id) ? id : null;
		anchored.push({ pos, id: valid });
		if (valid) count.set(valid, (count.get(valid) ?? 0) + 1);
	});
	const keeperAt = new Map<string, number>();
	for (const [id, times] of count) {
		if (times < 2) continue;
		const keeper = keeperOf(id);
		const atKeeper = keeper !== null && anchored.some((block) => block.id === id && block.pos === keeper);
		keeperAt.set(id, atKeeper ? (keeper as number) : (anchored.find((block) => block.id === id) as { pos: number }).pos);
	}
	return anchored.filter((block) => block.id === null || (keeperAt.has(block.id) && keeperAt.get(block.id) !== block.pos)).map((block) => block.pos);
}

/** Every anchor of a document, in reading order. */
export function blockIdsOf(doc: ProseMirrorNode): string[] {
	const ids: string[] = [];
	doc.descendants((node) => {
		const id = node.attrs[BLOCK_ID_ATTRIBUTE];
		if (isBlockId(id)) ids.push(id);
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
						parseHTML: (element: HTMLElement) => element.dataset.blockId ?? element.dataset.blockid ?? null,
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
				appendTransaction: (transactions, previous, state) => {
					// After an edit made here; the others' edits (live) come anchored by the editor that made them.
					const edited = transactions.some((transaction) => transaction.docChanged && !transaction.getMeta(LIVE_SYNC_META) && !transaction.getMeta(blockIdPluginKey));
					if (!edited) return null;
					// A copy of a block keeps none of its anchor: the block that had it before the edit (where the edit moved
					// it) keeps it, wherever the copy landed.
					const mapping = new Mapping();
					for (const step of transactions) mapping.appendMapping(step.mapping);
					const keeperOf = (blockId: string) => {
						const before = blockOf(previous.doc, blockId);
						if (!before) return null;
						const moved = mapping.mapResult(before.pos, 1);
						return moved.deleted ? null : moved.pos;
					};
					const transaction = state.tr.setMeta(blockIdPluginKey, true).setMeta('addToHistory', false);
					return stampAnchors(transaction, blocksWithoutAnchor(state.doc, types, keeperOf)) ? transaction : null;
				}
			})
		];
	}
});
