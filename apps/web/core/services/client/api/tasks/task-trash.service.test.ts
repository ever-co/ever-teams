import qs from 'qs';
import { TASK_TRASH_PAGE_SIZE, taskTrashService } from './task-trash.service';
import { taskService } from './task.service';
import { nextTrashOffset, trashStatusOf } from '@/core/hooks/tasks/use-task-trash';
import { trashedTaskNumberOf, trashedTaskPersonName } from '@/core/lib/utils/task-trash';
import type { ITrashedTask } from '@/core/types/interfaces/task/task-trash';

jest.mock('@/env-config', () => {
	const actual = jest.requireActual('@/env-config');
	return { ...actual, readRuntimeEnv: jest.fn() };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readRuntimeEnv } = require('@/env-config') as { readRuntimeEnv: jest.Mock };

// The signed-in organization the availability check reads (cookies in the app).
jest.mock('@/core/lib/utils/task-discussion', () => {
	const actual = jest.requireActual('@/core/lib/utils/task-discussion');
	return { ...actual, taskDiscussionScope: jest.fn(() => null) };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { taskDiscussionScope } = require('@/core/lib/utils/task-discussion') as { taskDiscussionScope: jest.Mock };

const scope = { tenantId: 'tenant-1', organizationId: 'organization-1' };

function task(id: string): ITrashedTask {
	return { id, title: id, deletedAt: '2026-11-10T08:00:00.000Z' };
}

function queryOf(url: unknown): Record<string, unknown> {
	return qs.parse(String(url).split('?')[1] ?? '');
}

describe('taskTrashService — the trash list, restore and delete forever', () => {
	afterEach(() => jest.restoreAllMocks());

	it('lists a team’s trash a page at a time, searching by title or number', async () => {
		const get = jest
			.spyOn(taskTrashService, 'get')
			.mockResolvedValue({ data: { items: [task('t1')], total: 1 } } as never);

		const page = await taskTrashService.list({ organizationTeamId: 'team-1', search: '  42 ', skip: 50 }, scope);

		expect(page).toEqual({ items: [task('t1')], total: 1 });
		expect(String(get.mock.calls[0][0]).split('?')[0]).toBe('/tasks/trash');
		expect(queryOf(get.mock.calls[0][0])).toEqual({
			...scope,
			organizationTeamId: 'team-1',
			search: '42',
			skip: '50',
			take: String(TASK_TRASH_PAGE_SIZE)
		});
	});

	it('lists a project’s trash, leaving out what is not stated', async () => {
		const get = jest.spyOn(taskTrashService, 'get').mockResolvedValue({ data: { items: [], total: 0 } } as never);

		await taskTrashService.list({ organizationTeamId: null, projectId: 'project-1', search: '' }, scope);

		const query = queryOf(get.mock.calls[0][0]);
		expect(query).toMatchObject({ projectId: 'project-1', skip: '0' });
		expect(query).not.toHaveProperty('organizationTeamId');
		expect(query).not.toHaveProperty('search');
	});

	it('restores through the platform’s recover, and deletes for good through the hard delete', async () => {
		const put = jest.spyOn(taskTrashService, 'put').mockResolvedValue({ data: undefined } as never);
		const remove = jest
			.spyOn(taskTrashService, 'delete')
			.mockResolvedValue({ data: { raw: [], affected: 1 } } as never);

		await taskTrashService.restore('t1', scope);
		await expect(taskTrashService.deleteForever('t1')).resolves.toEqual({ raw: [], affected: 1 });

		expect(String(put.mock.calls[0][0]).split('?')[0]).toBe('/tasks/t1/recover');
		expect(remove).toHaveBeenCalledWith('/tasks/t1');
	});
});

describe('taskService.deleteTask — the trash flag', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		readRuntimeEnv.mockReset();
	});

	it('moves the task to the trash when NEXT_PUBLIC_TASK_TRASH_ENABLED is on and the platform keeps one', async () => {
		readRuntimeEnv.mockImplementation((name: string) =>
			name === 'NEXT_PUBLIC_TASK_TRASH_ENABLED' ? 'true' : undefined
		);
		jest.spyOn(taskTrashService, 'isAvailable').mockResolvedValue(true);
		const remove = jest.spyOn(taskService, 'delete').mockResolvedValue({ data: {} } as never);

		await expect(taskService.deleteTask('t1')).resolves.toEqual({ raw: [], affected: 1 });

		expect(remove).toHaveBeenCalledWith('/tasks/t1/soft');
	});

	it('deletes for good when the platform keeps no trash, so no task is hidden beyond restore', async () => {
		readRuntimeEnv.mockImplementation((name: string) =>
			name === 'NEXT_PUBLIC_TASK_TRASH_ENABLED' ? 'true' : undefined
		);
		jest.spyOn(taskTrashService, 'isAvailable').mockResolvedValue(false);
		const remove = jest.spyOn(taskService, 'delete').mockResolvedValue({ data: { raw: [], affected: 1 } } as never);

		await taskService.deleteTask('t1');

		expect(remove).toHaveBeenCalledWith('/tasks/t1');
	});

	it('deletes for good, as before, when the flag is off', async () => {
		readRuntimeEnv.mockReturnValue(undefined);
		const remove = jest.spyOn(taskService, 'delete').mockResolvedValue({ data: { raw: [], affected: 1 } } as never);

		await taskService.deleteTask('t1');

		expect(remove).toHaveBeenCalledWith('/tasks/t1');
	});
});

describe('taskTrashService.isAvailable — whether a delete may go to the trash', () => {
	afterEach(() => jest.restoreAllMocks());

	it('reads the trash once per organization: answered (403 too) means kept, 404 or 400 means off', async () => {
		taskDiscussionScope.mockReturnValue({ ...scope, organizationId: 'org-kept' });
		const get = jest.spyOn(taskTrashService, 'get').mockRejectedValueOnce({ response: { status: 403 } });

		await expect(taskTrashService.isAvailable()).resolves.toBe(true);
		await expect(taskTrashService.isAvailable()).resolves.toBe(true);
		expect(get).toHaveBeenCalledTimes(1);
		expect(queryOf(get.mock.calls[0][0])).toEqual({ ...scope, organizationId: 'org-kept', take: '1' });

		taskDiscussionScope.mockReturnValue({ ...scope, organizationId: 'org-off' });
		get.mockRejectedValueOnce({ statusCode: 404 });
		await expect(taskTrashService.isAvailable()).resolves.toBe(false);
		await expect(taskTrashService.isAvailable()).resolves.toBe(false);
		expect(get).toHaveBeenCalledTimes(2);
	});

	it('does not remember an unclear failure, and has no trash without a signed-in organization', async () => {
		taskDiscussionScope.mockReturnValue({ ...scope, organizationId: 'org-flaky' });
		const get = jest
			.spyOn(taskTrashService, 'get')
			.mockRejectedValueOnce(new Error('network'))
			.mockResolvedValueOnce({ data: { items: [], total: 0 } } as never);

		await expect(taskTrashService.isAvailable()).resolves.toBe(false);
		await expect(taskTrashService.isAvailable()).resolves.toBe(true);
		expect(get).toHaveBeenCalledTimes(2);

		taskDiscussionScope.mockReturnValue(null);
		await expect(taskTrashService.isAvailable()).resolves.toBe(false);
	});
});

describe('the trash list helpers', () => {
	it('reads the next page offset until every task is read', () => {
		expect(nextTrashOffset([{ items: [task('a'), task('b')], total: 3 }])).toBe(2);
		expect(
			nextTrashOffset([
				{ items: [task('a'), task('b')], total: 3 },
				{ items: [task('c')], total: 3 }
			])
		).toBeUndefined();
		// A page that came back empty ends the list even if the total says more.
		expect(
			nextTrashOffset([
				{ items: [task('a')], total: 3 },
				{ items: [], total: 3 }
			])
		).toBeUndefined();
		expect(nextTrashOffset([])).toBeUndefined();
	});

	it('reads the platform’s 404 as a trash it keeps off and 403 as one the reader may not see', () => {
		expect(trashStatusOf({ statusCode: 404 })).toBe('unavailable');
		expect(trashStatusOf({ response: { status: 403 } })).toBe('forbidden');
		expect(trashStatusOf({ status: 500 })).toBe('error');
		expect(trashStatusOf(new Error('network'))).toBe('error');
	});

	it('shows the task key and who deleted it', () => {
		expect(trashedTaskNumberOf({ taskNumber: 'API-42' })).toBe('API-42');
		expect(trashedTaskNumberOf({ prefix: 'API', number: 42 })).toBe('API-42');
		expect(trashedTaskNumberOf({ number: 7 })).toBe('#7');
		expect(trashedTaskNumberOf({})).toBe('');
		expect(trashedTaskPersonName({ firstName: 'Ann', lastName: 'Lee' })).toBe('Ann Lee');
		expect(trashedTaskPersonName({ name: 'ann' })).toBe('ann');
		expect(trashedTaskPersonName(null)).toBe('');
	});
});
