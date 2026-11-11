import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { BLOCK_ID_ATTRIBUTE, isBlockId } from '@/core/components/common/rich-editor/block-id-extension';
import { taskIdOfHref } from '@/core/lib/utils/docs-links';

/**
 * The Docs editor's own layer over the app's rich editor: the blocks with an open comment thread are marked (a button
 * at their start opens the thread), the block a link or a thread points at is lit, and links to tasks read as chips
 * with the task's number and status (the chip opens the task drawer). Nothing here changes the document: what is
 * shown comes in as transaction meta.
 */

// ---------------------------------------------------------------- comment marks

export interface DocsCommentMarks {
	/** The blocks with an open thread. */
	open: ReadonlySet<string>;
	/** The block a thread or a link points at, lit. */
	active: string | null;
}

export const docsCommentMarksKey = new PluginKey<DocsCommentMarks>('docsCommentMarks');

const NO_MARKS: DocsCommentMarks = { open: new Set(), active: null };

export interface DocsCommentMarksOptions {
	onOpenThread: (blockId: string) => void;
	/** Comment on the selection (Mod-Alt-M). */
	onComment: () => void;
	markerLabel: () => string;
}

/** Sets what the editor marks; resolving a thread never touches the document. */
export function setCommentMarks(view: EditorView | null | undefined, marks: Partial<DocsCommentMarks>): void {
	if (!view || (view as { isDestroyed?: boolean }).isDestroyed) return;
	view.dispatch(view.state.tr.setMeta(docsCommentMarksKey, marks).setMeta('addToHistory', false));
}

function commentMarker(blockId: string, options: DocsCommentMarksOptions): HTMLElement {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'docs-comment-marker';
	button.contentEditable = 'false';
	button.dataset.blockId = blockId;
	button.setAttribute('aria-label', options.markerLabel());
	button.title = options.markerLabel();
	// The selection would move under a click and rebuild the marker: the press is on mousedown.
	button.addEventListener('mousedown', (event) => {
		event.preventDefault();
		event.stopPropagation();
		options.onOpenThread(blockId);
	});
	return button;
}

function commentDecorations(doc: ProseMirrorNode, marks: DocsCommentMarks, options: DocsCommentMarksOptions): DecorationSet {
	if (marks.open.size === 0 && !marks.active) return DecorationSet.empty;
	const decorations: Decoration[] = [];
	doc.descendants((node, pos) => {
		const blockId = node.attrs[BLOCK_ID_ATTRIBUTE];
		if (!isBlockId(blockId)) return true;
		const isOpen = marks.open.has(blockId);
		const isActive = marks.active === blockId;
		if (!isOpen && !isActive) return true;
		const classes = [isOpen && 'docs-commented-block', isActive && 'docs-active-block'].filter(Boolean).join(' ');
		decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: classes }));
		// The button sits at the start of a text block; a block of blocks (a list, a quote) marks its own text blocks.
		if (isOpen && node.isTextblock) {
			decorations.push(
				Decoration.widget(pos + 1, () => commentMarker(blockId, options), { side: -1, key: `comment-${blockId}`, ignoreSelection: true })
			);
		}
		return true;
	});
	return DecorationSet.create(doc, decorations);
}

export const DocsCommentMarksExtension = Extension.create<DocsCommentMarksOptions>({
	name: 'docsCommentMarks',

	addOptions() {
		return { onOpenThread: () => undefined, onComment: () => undefined, markerLabel: () => '' };
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
		return [
			new Plugin<{ marks: DocsCommentMarks; decorations: DecorationSet }>({
				key: docsCommentMarksKey as PluginKey,
				state: {
					init: () => ({ marks: NO_MARKS, decorations: DecorationSet.empty }),
					apply: (transaction, value, _previous, state) => {
						const asked = transaction.getMeta(docsCommentMarksKey) as Partial<DocsCommentMarks> | undefined;
						if (asked) {
							const marks = { ...value.marks, ...asked };
							return { marks, decorations: commentDecorations(state.doc, marks, options) };
						}
						if (!transaction.docChanged) return value;
						return { marks: value.marks, decorations: commentDecorations(state.doc, value.marks, options) };
					}
				},
				props: {
					decorations(state: EditorState) {
						return (this as Plugin).getState(state)?.decorations ?? DecorationSet.empty;
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
		const last = runs[runs.length - 1];
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
	element.addEventListener('mousedown', (event) => {
		event.preventDefault();
		event.stopPropagation();
		options.onOpenTask(taskId);
	});
	return element;
}

function chipDecorations(doc: ProseMirrorNode, chips: ReadonlyMap<string, DocsTaskChip>, options: DocsTaskChipsOptions): DecorationSet {
	const decorations: Decoration[] = [];
	for (const run of taskLinkRunsOf(doc, options.origin())) {
		const chip = chips.get(run.taskId);
		decorations.push(Decoration.inline(run.from, run.to, { class: 'docs-task-link' }));
		decorations.push(
			Decoration.widget(run.from, () => taskChip(run.taskId, chip, options), {
				side: -1,
				key: `task-${run.from}-${run.taskId}-${chip?.number ?? ''}-${chip?.status ?? ''}`,
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
