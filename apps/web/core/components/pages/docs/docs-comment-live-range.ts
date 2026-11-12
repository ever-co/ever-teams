import type { EditorState } from '@tiptap/pm/state';
import { absolutePositionToRelativePosition, ySyncPluginKey } from '@tiptap/y-tiptap';
import type { Doc, XmlFragment } from 'yjs';
import { encodeLiveAnchorPosition, liveAnchorResolverOf } from '@/core/lib/docs-live/anchor-resolver';
import { blockAround, textOffsetInBlock, type DocsLiveRelativeRange } from './docs-comment-ranges';

/**
 * The ends of a comment's range as live relative positions of the page's shared document, read through the editor's
 * Yjs binding. Apart from `docs-comment-ranges.ts` so the editor's comment layer reads ranges without the binding.
 */

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
