import qs from 'qs';
import { commentService } from './comment.service';
import { commentReactionService } from './comment-reaction.service';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { resolveUpdateOf, withCommentRestored, withoutComment } from '@/core/hooks/tasks/use-task-comments';
import type { TaskCommentItem } from '@/core/types/interfaces/task/task-discussion';

const scope = { tenantId: 'tenant-1', organizationId: 'organization-1' };

/** The query a request asked for, read back from its URL. */
function queryOf(url: unknown): Record<string, unknown> {
	return qs.parse(String(url).split('?')[1] ?? '');
}

/**
 * The comment flows the task discussion adds: edit, delete with an undo, resolve and reopen, reactions. Each is one
 * platform call; the platform decides who may (the author, on `CommentService.assertMayManage`).
 */
describe('commentService — edit, delete, resolve', () => {
	afterEach(() => jest.restoreAllMocks());

	it('edits a comment’s text with the mentions it now holds', async () => {
		const put = jest.spyOn(commentService, 'put').mockResolvedValue({ data: { id: 'c1' } } as never);

		await commentService.update('c1', { comment: 'Fixed', mentionEmployeeIds: ['ann'] }, scope);

		expect(put).toHaveBeenCalledWith('/comment/c1', { comment: 'Fixed', mentionEmployeeIds: ['ann'], ...scope });
	});

	it('withdraws a comment, and brings it back on undo', async () => {
		const remove = jest.spyOn(commentService, 'delete').mockResolvedValue({ data: undefined } as never);
		const put = jest.spyOn(commentService, 'put').mockResolvedValue({ data: undefined } as never);

		await commentService.softDelete('c1', scope);
		await commentService.recover('c1', scope);

		expect(String(remove.mock.calls[0][0]).split('?')[0]).toBe('/comment/c1/soft');
		expect(queryOf(remove.mock.calls[0][0])).toEqual(scope);
		expect(String(put.mock.calls[0][0]).split('?')[0]).toBe('/comment/c1/recover');
	});

	it('resolves a thread as the caller, and a reopen clears the resolver', async () => {
		const put = jest.spyOn(commentService, 'put').mockResolvedValue({ data: { id: 'c1' } } as never);
		const now = new Date('2026-11-11T12:00:00.000Z');

		await commentService.setResolved('c1', resolveUpdateOf(true, 'employee-me', now), scope);
		await commentService.setResolved('c1', resolveUpdateOf(false, 'employee-me', now), scope);

		expect(put.mock.calls[0][1]).toEqual({
			resolved: true,
			resolvedAt: '2026-11-11T12:00:00.000Z',
			resolvedByEmployeeId: 'employee-me',
			...scope
		});
		expect(put.mock.calls[1][1]).toEqual({
			resolved: false,
			resolvedAt: null,
			resolvedByEmployeeId: null,
			...scope
		});
	});

	it('reads the resolver with the author relations', async () => {
		const get = jest.spyOn(commentService, 'get').mockResolvedValue({ data: { items: [], total: 0 } } as never);

		await commentService.getAll(EBaseEntityEnum.Task, 'task-1', scope);

		expect(queryOf(get.mock.calls[0][0]).relations).toEqual(
			expect.arrayContaining([
				'employee',
				'employee.user',
				'createdByUser',
				'resolvedByEmployee',
				'resolvedByEmployee.user'
			])
		);
	});
});

describe('withoutComment — the list while a delete runs', () => {
	it('drops the deleted comment and keeps the rest (replies stand on their own)', () => {
		const comments = [{ id: 'c1' }, { id: 'c2', parentId: 'c1' }] as TaskCommentItem[];

		expect(withoutComment(comments, 'c1').map((comment) => comment.id)).toEqual(['c2']);
		expect(withoutComment(undefined, 'c1')).toEqual([]);
	});
});

describe('withCommentRestored — a refused delete puts back only its own comment', () => {
	const list = (ids: string[]) => ids.map((id) => ({ id })) as TaskCommentItem[];

	it('puts the comment back in its place, leaving the other pending delete hidden', () => {
		// A and B deleted one after the other; B was refused, A went through.
		const beforeB = list(['c2', 'c3', 'c4']);
		expect(withCommentRestored(list(['c2', 'c4']), beforeB, 'c3').map((comment) => comment.id)).toEqual([
			'c2',
			'c3',
			'c4'
		]);
		// A was refused after B was hidden: A comes back, B stays hidden.
		const beforeA = list(['c1', 'c2', 'c3']);
		expect(withCommentRestored(list(['c2']), beforeA, 'c1').map((comment) => comment.id)).toEqual(['c1', 'c2']);
	});

	it('changes nothing when the comment is already there or was never known', () => {
		const current = list(['c1', 'c2']);
		expect(withCommentRestored(current, list(['c1', 'c2']), 'c1')).toBe(current);
		expect(withCommentRestored(current, list(['c1']), 'c9')).toBe(current);
	});
});

describe('commentReactionService', () => {
	afterEach(() => jest.restoreAllMocks());

	it('reads the reactions of a task’s comments in one request', async () => {
		const answer = [{ entity: 'Comment', entityId: 'c1', emoji: '👍', count: 1, reactedByMe: false, reactors: [] }];
		const get = jest.spyOn(commentReactionService, 'get').mockResolvedValue({ data: answer } as never);

		await expect(commentReactionService.getForRecord(EBaseEntityEnum.Task, 'task-1', scope)).resolves.toEqual(
			answer
		);

		expect(String(get.mock.calls[0][0]).split('?')[0]).toBe('/reaction/comments');
		expect(queryOf(get.mock.calls[0][0])).toEqual({ entity: 'Task', entityId: 'task-1', ...scope });
	});

	it('reads a malformed answer as no reactions', async () => {
		jest.spyOn(commentReactionService, 'get').mockResolvedValue({ data: { message: 'odd' } } as never);

		await expect(commentReactionService.getForRecord(EBaseEntityEnum.Task, 'task-1', scope)).resolves.toEqual([]);
	});

	it('toggles a reaction through the platform’s toggle', async () => {
		const post = jest.spyOn(commentReactionService, 'post').mockResolvedValue({ data: undefined } as never);
		const input = { entity: 'Comment' as const, entityId: 'c1', emoji: '👍', ...scope };

		await commentReactionService.toggle(input);

		expect(post).toHaveBeenCalledWith('/reaction', input);
	});
});
