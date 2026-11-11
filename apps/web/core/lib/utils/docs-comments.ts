import type { IComment } from '@/core/types/interfaces/common/comment';
import type { IDocumentNode } from '@/core/types/interfaces/common/docs';

/**
 * The comments of a Docs page are the platform's comments on entity `Document`. A thread anchored to the text says
 * which block it is on in the first line of its body, `[[block:<blockId>]]`: the platform's comment has no field for
 * an anchor, and the platform's own Docs editor writes and reads the same line (its Markdown merge refuses to guess
 * the place of a commented block). The line never reaches a reader: every view reads the body through
 * {@link parseBlockAnchor}.
 */
export const BLOCK_ANCHOR_PATTERN = /^\[\[block:([A-Za-z0-9._:-]{1,128})\]\]\r?\n?/;

/** A comment body split into the block it is anchored to (null for the page as a whole) and the text written. */
export interface DocsAnchoredBody {
	blockId: string | null;
	body: string;
}

export function parseBlockAnchor(comment: string | null | undefined): DocsAnchoredBody {
	const text = comment ?? '';
	const match = BLOCK_ANCHOR_PATTERN.exec(text);
	if (!match) return { blockId: null, body: text };
	return { blockId: match[1], body: text.slice(match[0].length) };
}

/** The body as it is sent: the anchor line first when there is a block, never twice. */
export function withBlockAnchor(blockId: string | null | undefined, body: string): string {
	const clean = parseBlockAnchor(body).body;
	return blockId ? `[[block:${blockId}]]\n${clean}` : clean;
}

/** One thread: its first comment, the replies under it (oldest first), the block it is on and whether it is closed. */
export interface DocsCommentThread {
	id: string;
	root: IComment;
	replies: IComment[];
	blockId: string | null;
	resolved: boolean;
}

export type DocsCommentTab = 'open' | 'resolved';

function createdTimeOf(comment: IComment): number {
	const time = Date.parse(comment.createdAt ?? '');
	return Number.isFinite(time) ? time : 0;
}

function byCreatedAt(left: IComment, right: IComment): number {
	return createdTimeOf(left) - createdTimeOf(right) || String(left.id).localeCompare(String(right.id));
}

/**
 * The threads of a page's comments. Replies are one level deep (the platform's rule); a reply whose parent is not
 * in the list stands as a thread of its own rather than being lost. A thread is on the block its first comment names.
 */
export function docsCommentThreads(comments: readonly IComment[]): DocsCommentThread[] {
	const ids = new Set(comments.map((comment) => String(comment.id)));
	const repliesOf = new Map<string, IComment[]>();
	const roots: IComment[] = [];
	for (const comment of comments) {
		const parentId = comment.parentId ? String(comment.parentId) : null;
		if (parentId && parentId !== String(comment.id) && ids.has(parentId)) {
			const replies = repliesOf.get(parentId) ?? [];
			replies.push(comment);
			repliesOf.set(parentId, replies);
		} else {
			roots.push(comment);
		}
	}
	return roots.sort(byCreatedAt).map((root) => ({
		id: String(root.id),
		root,
		replies: (repliesOf.get(String(root.id)) ?? []).sort(byCreatedAt),
		blockId: parseBlockAnchor(root.comment).blockId,
		resolved: root.resolved === true
	}));
}

/**
 * The threads in reading order: those on a block in the order of the blocks on the page, then the page's own and those
 * whose block is gone, oldest first.
 */
export function sortThreadsByDocument(threads: readonly DocsCommentThread[], blockOrder: readonly string[]): DocsCommentThread[] {
	const at = new Map(blockOrder.map((blockId, index) => [blockId, index]));
	const placeOf = (thread: DocsCommentThread) => (thread.blockId !== null && at.has(thread.blockId) ? (at.get(thread.blockId) as number) : Number.MAX_SAFE_INTEGER);
	return [...threads].sort((left, right) => placeOf(left) - placeOf(right) || byCreatedAt(left.root, right.root));
}

export function threadsOfTab(threads: readonly DocsCommentThread[], tab: DocsCommentTab): DocsCommentThread[] {
	return threads.filter((thread) => (tab === 'resolved' ? thread.resolved : !thread.resolved));
}

/** The blocks with a thread still open: the editor marks them. */
export function openThreadBlockIds(threads: readonly DocsCommentThread[]): string[] {
	const open = new Set<string>();
	for (const thread of threads) {
		if (!thread.resolved && thread.blockId) open.add(thread.blockId);
	}
	return [...open];
}

/** The thread a comment belongs to (its first comment or a reply), for a `?thread=` link. */
export function threadOfComment(threads: readonly DocsCommentThread[], commentId: string | null | undefined): DocsCommentThread | null {
	if (!commentId) return null;
	return threads.find((thread) => thread.id === commentId || thread.replies.some((reply) => String(reply.id) === commentId)) ?? null;
}

/** The open thread on a block, the newest first, for a click on a marked block. */
export function openThreadOnBlock(threads: readonly DocsCommentThread[], blockId: string): DocsCommentThread | null {
	const onBlock = threads.filter((thread) => !thread.resolved && thread.blockId === blockId);
	return onBlock.length > 0 ? onBlock[onBlock.length - 1] : null;
}

/**
 * Whether the reader wrote the comment: the platform lets only its author edit, resolve or remove it. A comment of
 * an employee is theirs; an author-less one belongs to the user who posted it.
 */
export function isCommentAuthor(comment: Pick<IComment, 'employeeId' | 'createdByUserId'>, reader: { employeeId: string | null; userId: string | null }): boolean {
	if (comment.employeeId) return !!reader.employeeId && String(comment.employeeId) === String(reader.employeeId);
	return !!reader.userId && !!comment.createdByUserId && String(comment.createdByUserId) === String(reader.userId);
}

/** At most this many characters of a block's text quote the place of a thread. */
export const THREAD_QUOTE_MAX_LENGTH = 140;

/** A quote of a block's text for a thread: one line, cut at a word near the limit. */
export function quoteOf(text: string | null | undefined, maxLength = THREAD_QUOTE_MAX_LENGTH): string {
	const line = (text ?? '').replace(/\s+/g, ' ').trim();
	if (line.length <= maxLength) return line;
	const cut = line.slice(0, maxLength);
	const space = cut.lastIndexOf(' ');
	return `${(space > maxLength * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

const INLINE_TYPES = new Set(['text', 'hardBreak', 'mention', 'employeeMention']);

/** The text of a node of the editor's document: inline content joined, blocks one after the other. */
function textOfNode(node: IDocumentNode | null | undefined, depth = 0): string {
	if (!node || depth > 200) return '';
	if (typeof node.text === 'string') return node.text;
	if (node.type === 'hardBreak') return ' ';
	if (node.type === 'mention' || node.type === 'employeeMention') return `@${String(node.attrs?.['label'] ?? '')}`;
	const children = node.content ?? [];
	const holdsInline = children.some((child) => INLINE_TYPES.has(String(child?.type ?? 'text')));
	return children.map((child) => textOfNode(child, depth + 1)).join(holdsInline ? '' : ' ');
}

/** The anchored blocks of a page's JSON: their anchors in reading order, and the text of each. */
export function anchoredBlocksOf(json: IDocumentNode | null | undefined): { order: string[]; text: Map<string, string> } {
	const order: string[] = [];
	const text = new Map<string, string>();
	const walk = (node: IDocumentNode | null | undefined, depth: number) => {
		if (!node || typeof node !== 'object' || depth > 200) return;
		const blockId = node.attrs?.['blockId'];
		if (typeof blockId === 'string' && blockId.length > 0 && !text.has(blockId)) {
			order.push(blockId);
			text.set(blockId, textOfNode(node).replace(/\s+/g, ' ').trim());
		}
		for (const child of node.content ?? []) walk(child, depth + 1);
	};
	walk(json, 0);
	return { order, text };
}
