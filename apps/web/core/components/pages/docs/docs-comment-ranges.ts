import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import { absolutePositionToRelativePosition, ySyncPluginKey } from '@tiptap/y-tiptap';
import type { Doc, XmlFragment } from 'yjs';
import { encodeLiveAnchorPosition, liveAnchorResolverOf } from '@/core/lib/docs-live/anchor-resolver';
import { commentAnchorInputOf, type DocsAnchorBlock } from '@/core/lib/utils/docs-comment-anchors';
import type { IDocumentCommentAnchorInput } from '@/core/types/interfaces/common/docs';

/**
 * Comment ranges in the editor's document: a block's text as the anchors count it (text nodes only), an editor
 * position as an offset into it and back, the selection as an anchor, and, in a live session, its ends as relative
 * positions of the shared document.
 */

/** A block of the editor's document: its anchor, its text, and where it is. */
export interface DocsEditorBlock extends DocsAnchorBlock {
	pos: number;
	node: ProseMirrorNode;
}

function blockIdOf(node: ProseMirrorNode): string | null {
	const value = node.attrs?.['blockId'];
	return typeof value === 'string' && value.length > 0 ? value : null;
}

/** The text of a node as the anchors count it: its text nodes, nothing between them. */
export function editorBlockTextOf(node: ProseMirrorNode): string {
	let text = '';
	node.descendants((child) => {
		if (child.isText) text += child.text ?? '';
		return true;
	});
	return text;
}

/** The blocks of the editor's document in order (an outer block before those inside it); a copied anchor is the first one's. */
export function editorBlocksOf(doc: ProseMirrorNode): DocsEditorBlock[] {
	const blocks: DocsEditorBlock[] = [];
	const seen = new Set<string>();
	doc.descendants((node, pos) => {
		const blockId = blockIdOf(node);
		if (blockId && !seen.has(blockId)) {
			seen.add(blockId);
			blocks.push({ blockId, text: editorBlockTextOf(node), pos, node });
		}
		return true;
	});
	return blocks;
}

/** The text nodes of the block at `blockPos`, in order: where each starts in the editor's document, and its length. */
function textRunsOf(node: ProseMirrorNode, blockPos: number): Array<{ from: number; size: number }> {
	const runs: Array<{ from: number; size: number }> = [];
	node.descendants((child, relative) => {
		if (!child.isText) return true;
		runs.push({ from: blockPos + 1 + relative, size: child.nodeSize });
		return false;
	});
	return runs;
}

/** The text before `pos` inside the block at `blockPos` (text nodes only). */
export function textOffsetInBlock(node: ProseMirrorNode, blockPos: number, pos: number): number {
	let offset = 0;
	for (const run of textRunsOf(node, blockPos)) {
		if (pos >= run.from + run.size) offset += run.size;
		else if (pos > run.from) offset += pos - run.from;
	}
	return offset;
}

/**
 * The editor position of a text offset in the block at `blockPos`. A range's start goes into the text after the offset
 * (`start`), its end into the text before it (`end`), so a range never takes in an atom beside it. An offset past the
 * text is the end of the last text; a block without text answers its content's start.
 */
export function positionOfTextOffset(node: ProseMirrorNode, blockPos: number, offset: number, side: 'start' | 'end'): number {
	const runs = textRunsOf(node, blockPos);
	let seen = 0;
	for (const run of runs) {
		const fits = side === 'start' ? offset < seen + run.size : offset <= seen + run.size;
		if (fits) return run.from + Math.max(0, offset - seen);
		seen += run.size;
	}
	const last = runs.at(-1);
	return last ? last.from + last.size : blockPos + 1;
}

/** The innermost block with an anchor around a position, and where it is. */
export function blockAround(state: EditorState, pos: number): { pos: number; node: ProseMirrorNode; blockId: string } | null {
	const $pos = state.doc.resolve(pos);
	for (let depth = $pos.depth; depth > 0; depth -= 1) {
		const node = $pos.node(depth);
		const blockId = blockIdOf(node);
		if (blockId) return { pos: $pos.before(depth), node, blockId };
	}
	return null;
}

/** The ends of a range as live relative positions (base64), read through the editor's binding to the shared document. */
export type DocsLiveRelativeRange = (from: number, to: number) => { relativeStart: string; relativeEnd: string } | null;

/**
 * The selection as a comment's anchor: the innermost block with an anchor around its start, the range clamped to that
 * block, its offsets in the block's text and the quote. Null for no block or no text selected (the comment is then on
 * the block). In a live session the ends are kept as relative positions too.
 */
export function selectionCommentAnchor(state: EditorState, liveRange?: DocsLiveRelativeRange | null): IDocumentCommentAnchorInput | null {
	const { from, to } = state.selection;
	if (to <= from) return null;
	const block = blockAround(state, from);
	if (!block) return null;
	const contentEnd = block.pos + block.node.nodeSize - 1;
	const end = Math.min(to, contentEnd);
	const startOffset = textOffsetInBlock(block.node, block.pos, from);
	const endOffset = textOffsetInBlock(block.node, block.pos, end);
	if (endOffset <= startOffset) return null;
	// The positions named are where the text starts and ends: what lies around it (an atom, the block's edge) is not.
	const relative = liveRange?.(
		positionOfTextOffset(block.node, block.pos, startOffset, 'start'),
		positionOfTextOffset(block.node, block.pos, endOffset, 'end')
	);
	return commentAnchorInputOf(block.blockId, editorBlockTextOf(block.node), startOffset, endOffset, relative ?? null);
}

interface SyncState {
	type?: XmlFragment;
	binding?: { mapping?: Map<unknown, unknown>; type?: XmlFragment } | null;
}

/**
 * The live relative positions of a range, when the editor is bound to a shared document (its sync plugin holds the
 * binding and its mapping); null otherwise. The positions are read back at once: ends that do not lead to the same
 * block and offsets (a binding not caught up yet) are not kept.
 */
export function liveRelativeRangeOf(state: EditorState, doc: Doc | null | undefined): DocsLiveRelativeRange | null {
	if (!doc) return null;
	const sync = ySyncPluginKey.getState(state) as SyncState | undefined;
	const mapping = sync?.binding?.mapping;
	const fragment = sync?.type ?? sync?.binding?.type;
	if (!mapping || !fragment || fragment.doc !== doc) return null;
	const resolve = liveAnchorResolverOf(doc);
	return (from, to) => {
		try {
			const relativeStart = encodeLiveAnchorPosition(absolutePositionToRelativePosition(from, fragment, mapping as never));
			const relativeEnd = encodeLiveAnchorPosition(absolutePositionToRelativePosition(to, fragment, mapping as never));
			const startBlock = blockAround(state, from);
			const endBlock = blockAround(state, to);
			const readStart = resolve(relativeStart);
			const readEnd = resolve(relativeEnd);
			if (!startBlock || !endBlock || !readStart || !readEnd) return null;
			const sameStart = readStart.blockId === startBlock.blockId && readStart.offset === textOffsetInBlock(startBlock.node, startBlock.pos, from);
			const sameEnd = readEnd.blockId === endBlock.blockId && readEnd.offset === textOffsetInBlock(endBlock.node, endBlock.pos, to);
			return sameStart && sameEnd ? { relativeStart, relativeEnd } : null;
		} catch {
			return null;
		}
	};
}
