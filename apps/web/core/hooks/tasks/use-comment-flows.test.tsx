/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const mockGetAll = jest.fn();
const mockUpdate = jest.fn();
const mockSoftDelete = jest.fn();
const mockRecover = jest.fn();
const mockSetResolved = jest.fn();
const mockReactions = jest.fn();
const mockToggle = jest.fn();

jest.mock('@/core/services/client/api/comments', () => ({
	commentService: {
		getAll: (...args: unknown[]) => mockGetAll(...args),
		create: jest.fn(),
		update: (...args: unknown[]) => mockUpdate(...args),
		softDelete: (...args: unknown[]) => mockSoftDelete(...args),
		recover: (...args: unknown[]) => mockRecover(...args),
		setResolved: (...args: unknown[]) => mockSetResolved(...args)
	},
	commentReactionService: {
		getForRecord: (...args: unknown[]) => mockReactions(...args),
		toggle: (...args: unknown[]) => mockToggle(...args)
	}
}));
jest.mock('@/core/hooks/documents/use-entity-files', () => ({ useCommentFileAttacher: () => jest.fn() }));
jest.mock('@/core/lib/utils/comments-trash-flags', () => ({
	isCommentReactionsEnabled: () => true,
	isTaskTrashEnabled: () => true
}));
jest.mock('@/core/lib/utils/task-discussion', () => {
	const actual = jest.requireActual('@/core/lib/utils/task-discussion');
	return { ...actual, taskDiscussionScope: () => ({ tenantId: 'ten', organizationId: 'org' }) };
});

import { useTaskComments } from './use-task-comments';
import { useCommentReactions } from './use-comment-reactions';

const scope = { tenantId: 'ten', organizationId: 'org' };
const task = { id: 'task-1', title: 'Task 1' };

function comment(id: string, extra: Record<string, unknown> = {}) {
	return {
		id,
		comment: `text of ${id}`,
		entity: 'Task',
		entityId: 'task-1',
		createdAt: '2026-11-11T10:00:00.000Z',
		...extra
	};
}

function wrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	};
}

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

beforeEach(() => {
	for (const mock of [
		mockGetAll,
		mockUpdate,
		mockSoftDelete,
		mockRecover,
		mockSetResolved,
		mockReactions,
		mockToggle
	]) {
		mock.mockReset();
	}
	mockGetAll.mockResolvedValue({
		items: [comment('c1'), comment('c2', { editedAt: '2026-11-11T11:00:00.000Z' })],
		total: 2
	});
});

describe('useTaskComments — edit, delete, resolve', () => {
	it('maps the edit marker and the resolver the platform answers', async () => {
		mockGetAll.mockResolvedValue({
			items: [
				comment('c1', {
					resolved: true,
					resolvedAt: '2026-11-11T12:00:00.000Z',
					resolvedByEmployee: { fullName: 'Ann Lee' },
					employeeId: 'emp'
				}),
				comment('c2', { editedAt: '2026-11-11T11:00:00.000Z' })
			],
			total: 2
		});
		const { result } = renderHook(() => useTaskComments(task), { wrapper: wrapper(client()) });

		await waitFor(() => expect(result.current.comments).toHaveLength(2));
		expect(result.current.comments[0]).toMatchObject({
			resolved: true,
			resolvedByName: 'Ann Lee',
			authorEmployeeId: 'emp'
		});
		expect(result.current.comments[1].editedAt).toEqual(new Date('2026-11-11T11:00:00.000Z'));
	});

	it('saves an edit with its mentions, then reads the thread again', async () => {
		mockUpdate.mockResolvedValue({ id: 'c1' });
		const { result } = renderHook(() => useTaskComments(task), { wrapper: wrapper(client()) });
		await waitFor(() => expect(result.current.comments).toHaveLength(2));
		const reads = mockGetAll.mock.calls.length;

		let isSaved = false;
		await act(async () => {
			isSaved = await result.current.editComment('c1', '  New text ', ['ann']);
		});

		expect(isSaved).toBe(true);
		expect(mockUpdate).toHaveBeenCalledWith('c1', { comment: 'New text', mentionEmployeeIds: ['ann'] }, scope);
		expect(mockGetAll.mock.calls.length).toBeGreaterThan(reads);
	});

	it('answers false on a refused edit, and sends nothing for an empty one', async () => {
		mockUpdate.mockRejectedValue(new Error('403'));
		const { result } = renderHook(() => useTaskComments(task), { wrapper: wrapper(client()) });
		await waitFor(() => expect(result.current.comments).toHaveLength(2));

		await act(async () => {
			expect(await result.current.editComment('c1', 'x', [])).toBe(false);
			expect(await result.current.editComment('c1', '   ', [])).toBe(false);
		});
		expect(mockUpdate).toHaveBeenCalledTimes(1);
	});

	it('hides a deleted comment at once, and its undo brings it back', async () => {
		mockSoftDelete.mockResolvedValue(undefined);
		mockRecover.mockResolvedValue(undefined);
		const { result } = renderHook(() => useTaskComments(task), { wrapper: wrapper(client()) });
		await waitFor(() => expect(result.current.comments).toHaveLength(2));
		mockGetAll.mockResolvedValue({ items: [comment('c2')], total: 1 });

		let deleted: Awaited<ReturnType<typeof result.current.deleteComment>> = null;
		await act(async () => {
			deleted = await result.current.deleteComment('c1');
		});

		expect(mockSoftDelete).toHaveBeenCalledWith('c1', scope);
		await waitFor(() => expect(result.current.comments.map((item) => item.id)).toEqual(['c2']));

		mockGetAll.mockResolvedValue({ items: [comment('c1'), comment('c2')], total: 2 });
		await act(async () => {
			expect(await deleted?.undo()).toBe(true);
		});
		expect(mockRecover).toHaveBeenCalledWith('c1', scope);
		await waitFor(() => expect(result.current.comments).toHaveLength(2));
	});

	it('keeps the comment’s mentions as stored when the edit leaves them out', async () => {
		mockUpdate.mockResolvedValue({ id: 'c1' });
		const { result } = renderHook(() => useTaskComments(task), { wrapper: wrapper(client()) });
		await waitFor(() => expect(result.current.comments).toHaveLength(2));

		await act(async () => {
			await result.current.editComment('c1', 'Typo fixed');
		});

		expect(mockUpdate).toHaveBeenCalledWith('c1', { comment: 'Typo fixed' }, scope);
	});

	it('does not hold a saved edit until the reactions are read again', async () => {
		mockUpdate.mockResolvedValue({ id: 'c1' });
		// The first reaction read answers; the one after the edit never does.
		mockReactions.mockResolvedValueOnce([]).mockReturnValue(new Promise(() => undefined));
		const me = { employeeId: 'emp', name: 'Me', imageUrl: null };
		const { result } = renderHook(
			() => ({ thread: useTaskComments(task), reactions: useCommentReactions('task-1', me) }),
			{ wrapper: wrapper(client()) }
		);
		await waitFor(() => expect(result.current.reactions.isAvailable).toBe(true));
		await waitFor(() => expect(result.current.thread.comments).toHaveLength(2));

		let isSaved = false;
		await act(async () => {
			isSaved = await result.current.thread.editComment('c1', 'New text');
		});

		expect(isSaved).toBe(true);
		expect(mockReactions.mock.calls.length).toBeGreaterThan(1);
	});

	it('puts a comment back when the platform refuses its delete', async () => {
		mockSoftDelete.mockRejectedValue(new Error('404'));
		const { result } = renderHook(() => useTaskComments(task), { wrapper: wrapper(client()) });
		await waitFor(() => expect(result.current.comments).toHaveLength(2));

		await act(async () => {
			expect(await result.current.deleteComment('c1')).toBeNull();
		});
		expect(result.current.comments.map((item) => item.id)).toEqual(['c1', 'c2']);
	});

	it('resolves and reopens a thread as the caller', async () => {
		mockSetResolved.mockResolvedValue({ id: 'c1' });
		const { result } = renderHook(() => useTaskComments(task), { wrapper: wrapper(client()) });
		await waitFor(() => expect(result.current.comments).toHaveLength(2));

		await act(async () => {
			expect(await result.current.setThreadResolved('c1', true, 'emp')).toBe(true);
			expect(await result.current.setThreadResolved('c1', false, 'emp')).toBe(true);
		});

		expect(mockSetResolved.mock.calls[0]).toEqual([
			'c1',
			{ resolved: true, resolvedAt: expect.any(String), resolvedByEmployeeId: 'emp' },
			scope
		]);
		expect(mockSetResolved.mock.calls[1]).toEqual([
			'c1',
			{ resolved: false, resolvedAt: null, resolvedByEmployeeId: null },
			scope
		]);
	});
});

describe('useCommentReactions — the toggle shows at once and is put back on a refusal', () => {
	const me = { employeeId: 'emp', name: 'Me', imageUrl: null };
	const thumbs = {
		entity: 'Comment',
		entityId: 'c1',
		emoji: '👍',
		count: 1,
		reactedByMe: false,
		reactors: [{ employeeId: 'ann', name: 'Ann' }]
	};

	it('reads the reactions of the task and groups them by comment', async () => {
		mockReactions.mockResolvedValue([thumbs]);
		const { result } = renderHook(() => useCommentReactions('task-1', me), { wrapper: wrapper(client()) });

		await waitFor(() => expect(result.current.isAvailable).toBe(true));
		expect(mockReactions).toHaveBeenCalledWith('Task', 'task-1', scope, expect.anything());
		expect(result.current.byComment.get('c1')).toEqual([thumbs]);
	});

	it('adds the caller’s reaction before the platform answers, then reads the summary again', async () => {
		mockReactions.mockResolvedValue([thumbs]);
		let release: () => void = () => undefined;
		mockToggle.mockImplementation(() => new Promise<void>((resolve) => (release = resolve)));
		const { result } = renderHook(() => useCommentReactions('task-1', me), { wrapper: wrapper(client()) });
		await waitFor(() => expect(result.current.isAvailable).toBe(true));

		let pending: Promise<boolean> = Promise.resolve(false);
		act(() => {
			pending = result.current.toggle('c1', '👍');
		});
		await waitFor(() =>
			expect(result.current.byComment.get('c1')?.[0]).toMatchObject({ count: 2, reactedByMe: true })
		);

		mockReactions.mockResolvedValue([{ ...thumbs, count: 2, reactedByMe: true }]);
		await act(async () => {
			release();
			expect(await pending).toBe(true);
		});
		expect(mockToggle).toHaveBeenCalledWith({ entity: 'Comment', entityId: 'c1', emoji: '👍', ...scope });
	});

	it('puts the chips back when the platform refuses the toggle', async () => {
		mockReactions.mockResolvedValue([thumbs]);
		mockToggle.mockRejectedValue(new Error('404'));
		const { result } = renderHook(() => useCommentReactions('task-1', me), { wrapper: wrapper(client()) });
		await waitFor(() => expect(result.current.isAvailable).toBe(true));

		await act(async () => {
			expect(await result.current.toggle('c1', '👍')).toBe(false);
		});

		await waitFor(() =>
			expect(result.current.byComment.get('c1')?.[0]).toMatchObject({ count: 1, reactedByMe: false })
		);
	});

	it('stays hidden when the platform has no summary to give', async () => {
		mockReactions.mockRejectedValue(Object.assign(new Error('Not Found'), { statusCode: 404 }));
		const { result } = renderHook(() => useCommentReactions('task-1', me), { wrapper: wrapper(client()) });

		await waitFor(() => expect(mockReactions).toHaveBeenCalled());
		expect(result.current.isAvailable).toBe(false);
	});

	it('does not let a caller without an employee react', async () => {
		mockReactions.mockResolvedValue([thumbs]);
		const { result } = renderHook(() => useCommentReactions('task-1', null), { wrapper: wrapper(client()) });
		await waitFor(() => expect(result.current.isAvailable).toBe(true));

		await act(async () => {
			expect(await result.current.toggle('c1', '👍')).toBe(false);
		});
		expect(mockToggle).not.toHaveBeenCalled();
	});
});
