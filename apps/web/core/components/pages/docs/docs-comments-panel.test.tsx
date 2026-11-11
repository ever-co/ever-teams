/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import type { DocsCommentsState } from '@/core/hooks/docs/use-docs-comments';
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

// The composer is the task drawer's (mentions, files): here a button posting a fixed text stands for it.
jest.mock('@/core/components/tasks/drawer/comment-composer', () => ({
	CommentComposer: ({
		onSubmit
	}: {
		onSubmit: (body: string, mentionEmployeeIds: string[], files: File[]) => Promise<boolean>;
	}) => (
		<button type="button" onClick={() => void onSubmit('On this block', [], [])}>
			post
		</button>
	)
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

function renderPanel(pendingAnchor: DocsPendingAnchor | null, beforePost: jest.Mock, post: jest.Mock) {
	return render(
		<DocsCommentsPanel
			comments={commentsState(post)}
			blockOrder={['b-1']}
			blockText={() => 'Typed since the last save'}
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

		expect(post).toHaveBeenCalledWith({ body: 'On this block', blockId: 'b-1', mentionEmployeeIds: [] });
	});

	it('posts a comment on the page without waiting for a save', async () => {
		const beforePost = jest.fn().mockResolvedValue(false);
		const post = jest.fn().mockResolvedValue({ id: 'c-1' });
		renderPanel(null, beforePost, post);

		await clickPost();

		expect(beforePost).not.toHaveBeenCalled();
		expect(post).toHaveBeenCalledWith({ body: 'On this block', blockId: null, mentionEmployeeIds: [] });
	});
});
