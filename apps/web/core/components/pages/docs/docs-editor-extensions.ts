import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { BLOCK_ID_ATTRIBUTE, isBlockId } from '@/core/components/common/rich-editor/block-id-extension';
import { resolveCommentAnchor, type DocsLiveAnchorResolver } from '@/core/lib/utils/docs-comment-anchors';
import { taskIdOfHref } from '@/core/lib/utils/docs-links';
import type { IDocumentCommentAnchorInput } from '@/core/types/interfaces/common/docs';
import { editorBlocksOf, positionOfTextOffset } from './docs-comment-ranges';

/**
 * The Docs editor's own layer over the app's rich editor: the text an open comment thread was made on is highlighted
 * (found again in the document as it is now; a click opens the thread), the blocks with an open thread are marked (a
 * button at their start opens the thread), the block a link or a thread points at is lit, and links to tasks read as chips
 * with the task's number and status (the chip opens the task drawer). Nothing here changes the document: what is
 * shown comes in as transaction meta.
 */

// ---------------------------------------------------------------- comment marks

/** An open thread made on a range of text: its stored anchor, found again in the editor's document as it is now. */
export interface DocsCommentRange {
	threadId: string;
	anchor: IDocumentCommentAnchorInput;
}

export interface DocsCommentMarks {
	/** The blocks with an open thread that has no range (made before ranges, or on a platform without them). */
	open: ReadonlySet<string>;
	/** The block a thread or a link points at, lit. */
	active: string | null;
	/** The open threads on a range of text, oldest first: their text is highlighted (a decoration, never a mark). */
	ranges: readonly DocsCommentRange[];
	/** The thread whose range is lit. */
	activeThread: string | null;
}

export const docsCommentMarksKey = new PluginKey<DocsCommentMarks>('docsCommentMarks');

const NO_MARKS: DocsCommentMarks = { open: new Set(), active: null, ranges: [], activeThread: null };

/** How long after the last edit the ranges are found again (meanwhile their highlights move with the text). */
export const COMMENT_RANGES_REFRESH_MS = 150;

const refreshRangesMeta = 'docsCommentRangesRefresh';

export interface DocsCommentMarksOptions {
	/** A block's marker (or a highlighted range) asks for its thread: the range's own, else the block's newest. */
	onOpenThread: (blockId: string, threadId?: string) => void;
	/** Comment on the selection (Mod-Alt-M). */
	onComment: () => void;
	markerLabel: () => string;
	/** The live relative positions of the page's shared document, while it is edited live. */
	liveResolver?: () => DocsLiveAnchorResolver | null;
}

/**
 * A widget button's action: on the mouse press (a click would first move the selection and rebuild the widget under
 * it), and on a click made from the keyboard (Enter, Space), which comes without a press.
 */
function onActivate(button: HTMLButtonElement, act: () => void): void {
	button.addEventListener('mousedown', (event) => {
		event.preventDefault();
		event.stopPropagation();
		act();
	});
	button.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (event.detail === 0) act();
	});
}

/** Sets what the editor marks; resolving a thread never touches the document. */
export function setCommentMarks(view: EditorView | null | undefined, marks: Partial<DocsCommentMarks>): void {
	if (!view || (view as { isDestroyed?: boolean }).isDestroyed) return;
	view.dispatch(view.state.tr.setMeta(docsCommentMarksKey, marks).setMeta('addToHistory', false));
}

function commentMarker(blockId: string, threadId: string | null, options: DocsCommentMarksOptions): HTMLElement {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'docs-comment-marker';
	button.contentEditable = 'false';
	button.dataset.blockId = blockId;
	button.setAttribute('aria-label', options.markerLabel());
	button.title = options.markerLabel();
	onActivate(button, () => (threadId ? options.onOpenThread(blockId, threadId) : options.onOpenThread(blockId)));
	return button;
}

/** What a range's highlight carries: the thread it opens. */
interface RangeSpec {
	threadId: string;
	blockId: string;
}

function isRangeSpec(spec: unknown): spec is RangeSpec {
	return typeof (spec as Partial<RangeSpec> | null)?.threadId === 'string';
}

function commentDecorations(doc: ProseMirrorNode, marks: DocsCommentMarks, options: DocsCommentMarksOptions): DecorationSet {
	if (marks.open.size === 0 && !marks.active && marks.ranges.length === 0) return DecorationSet.empty;
	const decorations: Decoration[] = [];
	// The ranges, found again in the document as it is now: a highlight each, and a marker on its block that opens the
	// newest thread there. A range whose text is gone falls back to its block (a tint, as a thread without a range).
	const tinted = new Set(marks.open);
	const markerThread = new Map<string, string>();
	if (marks.ranges.length > 0) {
		const blocks = editorBlocksOf(doc);
		const byId = new Map(blocks.map((block) => [block.blockId, block]));
		const live = options.liveResolver?.() ?? null;
		for (const { threadId, anchor } of marks.ranges) {
			const found = resolveCommentAnchor(anchor, blocks, live);
			const block = found.blockId ? byId.get(found.blockId) : undefined;
			if (!block) continue;
			markerThread.set(block.blockId, threadId);
			if (found.start === null || found.end === null || found.end <= found.start) {
				tinted.add(block.blockId);
				continue;
			}
			const from = positionOfTextOffset(block.node, block.pos, found.start, 'start');
			const to = positionOfTextOffset(block.node, block.pos, found.end, 'end');
			if (to <= from) continue;
			const isActive = marks.activeThread === threadId;
			decorations.push(
				Decoration.inline(
					from,
					to,
					{ class: isActive ? 'docs-comment-range docs-comment-range-active' : 'docs-comment-range', 'data-thread-range': threadId },
					{ threadId, blockId: block.blockId } satisfies RangeSpec
				)
			);
		}
	}
	doc.descendants((node, pos) => {
		const blockId = node.attrs[BLOCK_ID_ATTRIBUTE];
		if (!isBlockId(blockId)) return;
		const isTinted = tinted.has(blockId);
		const hasMarker = isTinted || markerThread.has(blockId);
		const isActive = marks.active === blockId;
		if (!hasMarker && !isActive) return;
		if (isTinted || isActive) {
			const classes = [isTinted && 'docs-commented-block', isActive && 'docs-active-block'].filter(Boolean).join(' ');
			decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: classes }));
		}
		// The button sits at the start of a text block; a block of blocks (a list, a quote) marks its own text blocks. A
		// block with a thread without a range opens the newest of those (the page view knows them); else its range's.
		if (hasMarker && node.isTextblock) {
			const threadId = marks.open.has(blockId) ? null : (markerThread.get(blockId) ?? null);
			decorations.push(
				Decoration.widget(pos + 1, () => commentMarker(blockId, threadId, options), {
					side: -1,
					key: `comment-${blockId}-${threadId ?? ''}`,
					ignoreSelection: true
				})
			);
		}
	});
	return DecorationSet.create(doc, decorations);
}

/** The highlighted range at a position (the shortest of those around it), when there is one. */
export function commentRangeAt(state: EditorState, pos: number): RangeSpec | null {
	const decorations = (docsCommentMarksKey.getState(state) as unknown as { decorations?: DecorationSet } | undefined)?.decorations;
	if (!decorations) return null;
	let best: { spec: RangeSpec; size: number } | null = null;
	for (const decoration of decorations.find(pos, pos, isRangeSpec)) {
		if (pos < decoration.from || pos > decoration.to) continue;
		const size = decoration.to - decoration.from;
		if (!best || size < best.size) best = { spec: decoration.spec as RangeSpec, size };
	}
	return best?.spec ?? null;
}

export const DocsCommentMarksExtension = Extension.create<DocsCommentMarksOptions>({
	name: 'docsCommentMarks',

	addOptions() {
		return { onOpenThread: () => undefined, onComment: () => undefined, markerLabel: () => '', liveResolver: () => null };
	},

	addKeyboardShortcuts() {
		return {
			'Mod-Alt-m': () => {
				this.options.onComment();
				return true;
			}
		};
	},

	addProseMirrorPlugins() {
		const options = this.options;
		type State = { marks: DocsCommentMarks; decorations: DecorationSet; stale: boolean };
		return [
			new Plugin<State>({
				key: docsCommentMarksKey as PluginKey,
				state: {
					init: () => ({ marks: NO_MARKS, decorations: DecorationSet.empty, stale: false }),
					apply: (transaction, value, _previous, state): State => {
						const asked = transaction.getMeta(docsCommentMarksKey) as Partial<DocsCommentMarks> | undefined;
						if (asked) {
							const marks = { ...value.marks, ...asked };
							return { marks, decorations: commentDecorations(state.doc, marks, options), stale: false };
						}
						if (transaction.getMeta(refreshRangesMeta)) {
							return { marks: value.marks, decorations: commentDecorations(state.doc, value.marks, options), stale: false };
						}
						if (!transaction.docChanged) return value;
						// Finding the ranges again reads the whole page: while it is typed in, the highlights move with the
						// text, and the ranges are found again a moment after the last edit.
						if (value.marks.ranges.length > 0) return { marks: value.marks, decorations: value.decorations.map(transaction.mapping, transaction.doc), stale: true };
						return { marks: value.marks, decorations: commentDecorations(state.doc, value.marks, options), stale: false };
					}
				},
				view: () => {
					let timer: ReturnType<typeof setTimeout> | null = null;
					return {
						update: (view, previous) => {
							const state = docsCommentMarksKey.getState(view.state) as unknown as State | undefined;
							if (!state?.stale) return;
							// Only an edit moves the moment on; the caret moving meanwhile does not.
							if (timer && view.state.doc === previous.doc) return;
							if (timer) clearTimeout(timer);
							timer = setTimeout(() => {
								timer = null;
								if ((view as { isDestroyed?: boolean }).isDestroyed) return;
								view.dispatch(view.state.tr.setMeta(refreshRangesMeta, true).setMeta('addToHistory', false));
							}, COMMENT_RANGES_REFRESH_MS);
						},
						destroy: () => {
							if (timer) clearTimeout(timer);
						}
					};
				},
				props: {
					decorations(state: EditorState) {
						return (this as Plugin).getState(state)?.decorations ?? DecorationSet.empty;
					},
					// A click in a highlighted range opens its thread; the caret still goes where the click was.
					handleClick(view, pos, event) {
						if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return false;
						const range = commentRangeAt(view.state, pos);
						if (range) options.onOpenThread(range.blockId, range.threadId);
						return false;
					}
				}
			})
		];
	}
});

// ---------------------------------------------------------------- task chips

/** What a chip shows of a task. */
export interface DocsTaskChip {
	/** `#123`, or null when the task has no number. */
	number: string | null;
	title: string;
	status: string | null;
	/** A CSS color of the status. */
	statusColor: string | null;
}

export const docsTaskChipsKey = new PluginKey('docsTaskChips');

export interface DocsTaskChipsOptions {
	/** This app's origin: only its task pages are tasks. */
	origin: () => string;
	onOpenTask: (taskId: string) => void;
	/** A chip of a task this page cannot read. */
	unknownLabel: () => string;
	openLabel: () => string;
}

/** Sets the tasks the chips show (from the team's tasks the app already holds). */
export function setTaskChips(view: EditorView | null | undefined, chips: ReadonlyMap<string, DocsTaskChip>): void {
	if (!view || (view as { isDestroyed?: boolean }).isDestroyed) return;
	view.dispatch(view.state.tr.setMeta(docsTaskChipsKey, chips).setMeta('addToHistory', false));
}

/** The task links of a document: each run of text under one task link, with the task it points at. */
export function taskLinkRunsOf(doc: ProseMirrorNode, origin: string): Array<{ from: number; to: number; taskId: string }> {
	const runs: Array<{ from: number; to: number; taskId: string; href: string }> = [];
	doc.descendants((node, pos) => {
		if (!node.isText) return true;
		const link = node.marks.find((mark) => mark.type.name === 'link');
		const href = typeof link?.attrs.href === 'string' ? link.attrs.href : null;
		const taskId = href ? taskIdOfHref(href, origin) : null;
		if (!taskId || !href) return false;
		const last = runs.at(-1);
		// A link with a bold word in it is several text nodes: one chip for the whole link.
		if (last && last.to === pos && last.href === href) {
			last.to = pos + node.nodeSize;
		} else {
			runs.push({ from: pos, to: pos + node.nodeSize, taskId, href });
		}
		return false;
	});
	return runs.map(({ from, to, taskId }) => ({ from, to, taskId }));
}

function taskChip(taskId: string, chip: DocsTaskChip | undefined, options: DocsTaskChipsOptions): HTMLElement {
	const element = document.createElement('button');
	element.type = 'button';
	element.className = 'docs-task-chip';
	element.contentEditable = 'false';
	element.dataset.taskId = taskId;
	element.title = options.openLabel();
	const label = document.createElement('span');
	label.className = 'docs-task-chip-number';
	label.textContent = chip?.number ?? options.unknownLabel();
	element.append(label);
	if (chip?.status) {
		const status = document.createElement('span');
		status.className = 'docs-task-chip-status';
		if (chip.statusColor) status.style.setProperty('--chip-status', chip.statusColor);
		status.textContent = chip.status;
		element.append(status);
	}
	element.setAttribute('aria-label', [options.openLabel(), chip?.number, chip?.title, chip?.status].filter(Boolean).join(' '));
	onActivate(element, () => options.onOpenTask(taskId));
	return element;
}

function chipDecorations(doc: ProseMirrorNode, chips: ReadonlyMap<string, DocsTaskChip>, options: DocsTaskChipsOptions): DecorationSet {
	const decorations: Decoration[] = [];
	for (const run of taskLinkRunsOf(doc, options.origin())) {
		const chip = chips.get(run.taskId);
		decorations.push(
			Decoration.inline(run.from, run.to, { class: 'docs-task-link' }),
			Decoration.widget(run.from, () => taskChip(run.taskId, chip, options), {
				side: -1,
				key: ['task', run.from, run.taskId, chip?.number ?? '', chip?.status ?? ''].join('-'),
				ignoreSelection: true
			})
		);
	}
	return decorations.length > 0 ? DecorationSet.create(doc, decorations) : DecorationSet.empty;
}

export const DocsTaskChipsExtension = Extension.create<DocsTaskChipsOptions>({
	name: 'docsTaskChips',
	// Before the link's own paste handling: a pasted task address becomes the task's title.
	priority: 1000,

	addOptions() {
		return { origin: () => '', onOpenTask: () => undefined, unknownLabel: () => '', openLabel: () => '' };
	},

	addProseMirrorPlugins() {
		const options = this.options;
		return [
			new Plugin<{ chips: ReadonlyMap<string, DocsTaskChip>; decorations: DecorationSet }>({
				key: docsTaskChipsKey,
				state: {
					init: (_config, state) => {
						const chips = new Map<string, DocsTaskChip>();
						return { chips, decorations: chipDecorations(state.doc, chips, options) };
					},
					apply: (transaction, value, _previous, state) => {
						const chips = transaction.getMeta(docsTaskChipsKey) as ReadonlyMap<string, DocsTaskChip> | undefined;
						if (chips) return { chips, decorations: chipDecorations(state.doc, chips, options) };
						if (!transaction.docChanged) return value;
						return { chips: value.chips, decorations: chipDecorations(state.doc, value.chips, options) };
					}
				},
				props: {
					decorations(state: EditorState) {
						return (this as Plugin).getState(state)?.decorations ?? DecorationSet.empty;
					},
					// Mod-click on a task link opens the task; a plain click places the caret in its text.
					handleClick(view, pos, event) {
						if (!(event.metaKey || event.ctrlKey)) return false;
						const link = view.state.doc.resolve(pos).marks().find((mark) => mark.type.name === 'link');
						const taskId = typeof link?.attrs.href === 'string' ? taskIdOfHref(link.attrs.href, options.origin()) : null;
						if (!taskId) return false;
						options.onOpenTask(taskId);
						return true;
					},
					// A task's address pasted on its own becomes a link titled with the task.
					handlePaste(view, event) {
						const text = event.clipboardData?.getData('text/plain')?.trim() ?? '';
						if (!text || /\s/.test(text) || !view.state.selection.empty) return false;
						const taskId = taskIdOfHref(text, options.origin());
						const linkType = view.state.schema.marks.link;
						if (!taskId || !linkType) return false;
						const chip = ((this as Plugin).getState(view.state) as { chips: ReadonlyMap<string, DocsTaskChip> } | undefined)?.chips.get(taskId);
						if (!chip?.title) return false;
						event.preventDefault();
						const { schema } = view.state;
						const transaction = view.state.tr.replaceSelectionWith(schema.text(chip.title, [linkType.create({ href: text })]), false);
						// A plain space after the link, so what is typed next is not part of it.
						const end = transaction.selection.to;
						transaction.insert(end, schema.text(' '));
						transaction.setSelection(TextSelection.create(transaction.doc, end + 1)).setStoredMarks([]);
						view.dispatch(transaction.scrollIntoView());
						return true;
					}
				}
			})
		];
	}
});
