/**
 * @jest-environment jsdom
 */
import { Editor, getSchema, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { BlockIds } from '@/core/components/common/rich-editor/block-id-extension';
import { DocsCommentMarksExtension, DocsTaskChipsExtension, setCommentMarks, setTaskChips, taskLinkRunsOf } from './docs-editor-extensions';

const ORIGIN = 'https://app.example.test';
const TASK = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

function link(text: string, href: string, extraMarks: JSONContent['marks'] = []): JSONContent {
	return { type: 'text', text, marks: [{ type: 'link', attrs: { href } }, ...(extraMarks ?? [])] };
}

describe('task links', () => {
	it('finds each task link once, across the marks inside it, and nothing else', () => {
		const schema = getSchema([StarterKit]);
		const doc = schema.nodeFromJSON({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'See ' },
						link('Fix ', `${ORIGIN}/task/${TASK}`),
						link('login', `${ORIGIN}/task/${TASK}`, [{ type: 'bold' }]),
						{ type: 'text', text: ' and ' },
						link('the docs', 'https://elsewhere.example/task/x')
					]
				},
				{ type: 'paragraph', content: [link('again', `/task/${TASK}`)] }
			]
		});
		const runs = taskLinkRunsOf(doc, ORIGIN);
		expect(runs).toHaveLength(2);
		expect(runs.map((run) => [run.taskId, doc.textBetween(run.from, run.to)])).toEqual([
			[TASK, 'Fix login'],
			[TASK, 'again']
		]);
	});
});

describe('the Docs layer of the editor', () => {
	function editorWith(content: JSONContent, handlers: { onOpenThread?: jest.Mock; onOpenTask?: jest.Mock } = {}) {
		const element = document.createElement('div');
		document.body.append(element);
		return new Editor({
			element,
			content,
			extensions: [
				StarterKit,
				BlockIds,
				DocsCommentMarksExtension.configure({ onOpenThread: handlers.onOpenThread ?? jest.fn(), onComment: jest.fn(), markerLabel: () => 'Open the comments' }),
				DocsTaskChipsExtension.configure({ origin: () => ORIGIN, onOpenTask: handlers.onOpenTask ?? jest.fn(), unknownLabel: () => 'Task', openLabel: () => 'Open task' })
			]
		});
	}

	it('marks the blocks with an open thread, and the marker opens it', () => {
		const onOpenThread = jest.fn();
		const editor = editorWith(
			{
				type: 'doc',
				content: [
					{ type: 'paragraph', attrs: { blockId: A }, content: [{ type: 'text', text: 'commented' }] },
					{ type: 'paragraph', attrs: { blockId: B }, content: [{ type: 'text', text: 'plain' }] }
				]
			},
			{ onOpenThread }
		);
		setCommentMarks(editor.view, { open: new Set([A]), active: B });
		const commented = editor.view.dom.querySelectorAll('.docs-commented-block');
		expect(commented).toHaveLength(1);
		expect(commented[0].textContent).toBe('commented');
		expect(editor.view.dom.querySelector('.docs-active-block')?.textContent).toBe('plain');
		const marker = editor.view.dom.querySelector<HTMLButtonElement>('.docs-comment-marker');
		expect(marker?.getAttribute('aria-label')).toBe('Open the comments');
		marker?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		expect(onOpenThread).toHaveBeenCalledWith(A);
		// The click after a mouse press does not open it twice; a click from the keyboard (no press) opens it.
		marker?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
		expect(onOpenThread).toHaveBeenCalledTimes(1);
		marker?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
		expect(onOpenThread).toHaveBeenCalledTimes(2);
		// Resolving the thread takes the mark away without touching the text.
		const before = editor.getJSON();
		setCommentMarks(editor.view, { open: new Set(), active: null });
		expect(editor.view.dom.querySelector('.docs-commented-block')).toBeNull();
		expect(editor.getJSON()).toEqual(before);
		editor.destroy();
	});

	it('highlights the text of a thread made on a range, found again after an edit, and its marker opens that thread', () => {
		jest.useFakeTimers();
		const onOpenThread = jest.fn();
		const editor = editorWith(
			{ type: 'doc', content: [{ type: 'paragraph', attrs: { blockId: A }, content: [{ type: 'text', text: 'The quick brown fox jumps' }] }] },
			{ onOpenThread }
		);
		const anchor = { blockId: A, start: 10, end: 19, quote: 'brown fox', prefix: 'The quick ', suffix: ' jumps' };
		setCommentMarks(editor.view, { open: new Set(), active: null, ranges: [{ threadId: 'thread-1', anchor }], activeThread: 'thread-1' });
		const range = () => editor.view.dom.querySelector<HTMLElement>('[data-thread-range="thread-1"]');
		expect(range()?.textContent).toBe('brown fox');
		expect(range()?.className).toContain('docs-comment-range-active');
		// A range without its own tint: the block is not marked as a whole.
		expect(editor.view.dom.querySelector('.docs-commented-block')).toBeNull();
		editor.view.dom.querySelector<HTMLButtonElement>('.docs-comment-marker')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		expect(onOpenThread).toHaveBeenCalledWith(A, 'thread-1');

		// Typed before the range: the highlight moves with the text, and the range is found again a moment later.
		editor.commands.insertContentAt(1, 'Oh, ');
		expect(range()?.textContent).toBe('brown fox');
		jest.advanceTimersByTime(500);
		expect(range()?.textContent).toBe('brown fox');
		// The text is gone: the thread falls back to its block (a tint), and nothing is highlighted.
		editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', attrs: { blockId: A }, content: [{ type: 'text', text: 'Rewritten' }] }] });
		jest.advanceTimersByTime(500);
		expect(range()).toBeNull();
		expect(editor.view.dom.querySelector('.docs-commented-block')?.textContent).toContain('Rewritten');
		editor.destroy();
		jest.useRealTimers();
	});

	it("shows a task link's number and status as a chip that opens the task", () => {
		const onOpenTask = jest.fn();
		const editor = editorWith({ type: 'doc', content: [{ type: 'paragraph', content: [link('Fix login', `${ORIGIN}/task/${TASK}`)] }] }, { onOpenTask });
		expect(editor.view.dom.querySelector('.docs-task-chip')?.textContent).toBe('Task');
		setTaskChips(editor.view, new Map([[TASK, { number: '#42', title: 'Fix login', status: 'In progress', statusColor: '#f59e0b' }]]));
		const chip = editor.view.dom.querySelector<HTMLButtonElement>('.docs-task-chip');
		expect(chip?.textContent).toBe('#42In progress');
		expect(chip?.dataset.taskId).toBe(TASK);
		chip?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		expect(onOpenTask).toHaveBeenCalledWith(TASK);
		// The chip is not part of the text.
		expect(editor.getText()).toBe('Fix login');
		editor.destroy();
	});
});
