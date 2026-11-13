/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import type { DocsCommentsState } from '@/core/hooks/docs/use-docs-comments';
import type { DocsThreadPlace } from '@/core/lib/utils/docs-comment-anchors';
import type { DocsCommentThread } from '@/core/lib/utils/docs-comments';
import { DocsCommentsPanel, type DocsPendingAnchor } from './docs-comments-panel';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

jest.mock('sonner', () => ({
	toast: Object.assign(jest.fn(), { error: jest.fn() })
}));

jest.mock('@/core/hooks/tasks/use-mention-candidates', () => ({
	useMentionCandidates: () => []
}));

// The delete confirmation imports the components barrel (the whole app): it plays no part here.
jest.mock('@/core/components/common/alert-dialog-confirmation', () => ({
	AlertDialogConfirmation: () => null
}));

type Submit = (body: string, mentionEmployeeIds: string[], files: File[]) => Promise<boolean>;

/** The latest submit the composer was given: a second Enter reaches it whatever the button shows. */
const mockComposer: { submit: Submit | null } = { submit: null };

// The composer is the task drawer's (mentions, files): here a button posting a fixed text stands for it, off while
// a comment is posting, as the composer's is.
jest.mock('@/core/components/tasks/drawer/comment-composer', () => ({
	CommentComposer: ({ onSubmit, isPosting }: { onSubmit: Submit; isPosting: boolean }) => {
		mockComposer.submit = onSubmit;
		return (
			<button type="button" disabled={isPosting} onClick={() => void onSubmit('On this block', [], [])}>
				post
			</button>
		);
	}
}));

function commentsState(post: jest.Mock): DocsCommentsState {
	return {
		comments: [],
		threads: [],
		isLoading: false,
		isReady: true,
		isError: false,
		refresh: jest.fn(),
		post,
		edit: jest.fn(),
		setResolved: jest.fn(),
		remove: jest.fn(),
		isPosting: false,
		isUpdating: false
	} as unknown as DocsCommentsState;
}

/** Where a thread is: its block, or the page (no ranges in these tests). */
function blockPlaceOf(thread: DocsCommentThread): DocsThreadPlace {
	return { kind: thread.blockId ? 'block' : 'page', blockId: thread.blockId, start: null, end: null, text: null, position: null };
}

function renderPanel(pendingAnchor: DocsPendingAnchor | null, beforePost: jest.Mock, post: jest.Mock) {
	return render(
		<DocsCommentsPanel
			comments={commentsState(post)}
			blockOrder={['b-1']}
			blockText={() => 'Typed since the last save'}
			placeOf={blockPlaceOf}
			reader={{ employeeId: 'emp-1', userId: 'user-1' }}
			activeThreadId={null}
			activeThreadRequest={0}
			onSelectThread={jest.fn()}
			beforePost={beforePost}
			pendingAnchor={pendingAnchor}
			onClearPending={jest.fn()}
			canComment
			onCopyThreadLink={jest.fn()}
			onClose={jest.fn()}
		/>
	);
}

async function clickPost() {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'post' }));
	});
}

describe('DocsCommentsPanel, a new comment on a block', () => {
	it('waits for the page edits to be saved even when the block had its anchor before (typed since the last save)', async () => {
		const beforePost = jest.fn().mockResolvedValue(false);
		const post = jest.fn().mockResolvedValue({ id: 'c-1' });
		renderPanel({ blockId: 'b-1', quote: 'Typed since the last save', created: false }, beforePost, post);

		await clickPost();

		expect(beforePost).toHaveBeenCalledTimes(1);
		expect(post).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith('docs.COMMENT_ANCHOR_UNSAVED');
	});

	it('posts on the block once the page holds its edits', async () => {
		const beforePost = jest.fn().mockResolvedValue(true);
		const post = jest.fn().mockResolvedValue({ id: 'c-1' });
		renderPanel({ blockId: 'b-1', quote: 'Typed since the last save', created: false }, beforePost, post);

		await clickPost();

		expect(post).toHaveBeenCalledWith({ body: 'On this block', blockId: 'b-1', mentionEmployeeIds: [], range: null });
	});

	it('posts once, however often it is sent while the save is waited for', async () => {
		let save: (held: boolean) => void = () => undefined;
		const beforePost = jest.fn(() => new Promise<boolean>((resolve) => (save = resolve)));
		const post = jest.fn().mockResolvedValue({ id: 'c-1' });
		renderPanel({ blockId: 'b-1', quote: 'Typed since the last save', created: false }, beforePost, post);

		await clickPost();
		const button = screen.getByRole('button', { name: 'post' }) as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		// Sent again meanwhile (a second Enter): refused.
		let again: boolean | undefined;
		await act(async () => {
			again = await mockComposer.submit?.('On this block', [], []);
		});
		expect(again).toBe(false);

		await act(async () => save(true));
		expect(beforePost).toHaveBeenCalledTimes(1);
		expect(post).toHaveBeenCalledTimes(1);
		expect(button.disabled).toBe(false);
	});

	it('posts a thread made on selected text with its range', async () => {
		const beforePost = jest.fn().mockResolvedValue(true);
		const post = jest.fn().mockResolvedValue({ id: 'c-1' });
		const range = { blockId: 'b-1', start: 6, end: 11, quote: 'since', prefix: 'Typed ', suffix: ' the last save' };
		renderPanel({ blockId: 'b-1', quote: 'since', created: false, range }, beforePost, post);

		await clickPost();

		expect(post).toHaveBeenCalledWith({ body: 'On this block', blockId: 'b-1', mentionEmployeeIds: [], range });
	});

	it('posts a comment on the page without waiting for a save', async () => {
		const beforePost = jest.fn().mockResolvedValue(false);
		const post = jest.fn().mockResolvedValue({ id: 'c-1' });
		renderPanel(null, beforePost, post);

		await clickPost();

		expect(beforePost).not.toHaveBeenCalled();
		expect(post).toHaveBeenCalledWith({ body: 'On this block', blockId: null, mentionEmployeeIds: [], range: null });
	});
});
