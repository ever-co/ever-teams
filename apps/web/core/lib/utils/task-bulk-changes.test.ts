import {
	bulkChangesForPlatform,
	bulkItemsForPlatform,
	bulkStatusNameOf,
	PLATFORM_TASK_STATUSES
} from './task-bulk-changes';

describe('bulk changes as the platform takes them', () => {
	it('knows the platform’s own status names', () => {
		expect([...PLATFORM_TASK_STATUSES]).toEqual([
			'backlog',
			'open',
			'in-progress',
			'ready-for-review',
			'in-review',
			'blocked',
			'done',
			'completed',
			'cancelled',
			'custom'
		]);
		expect(bulkStatusNameOf({ name: 'done', value: 'done' })).toBe('done');
		expect(bulkStatusNameOf({ name: 'Ready to ship', value: 'ready-for-review' })).toBe('ready-for-review');
		expect(bulkStatusNameOf({ name: 'in-progress' })).toBe('in-progress');
		expect(bulkStatusNameOf({ name: 'QA', value: 'qa' })).toBeUndefined();
		expect(bulkStatusNameOf({ name: 'todo', value: 'todo' })).toBeUndefined();
		expect(bulkStatusNameOf({ name: 'Done', value: '' })).toBeUndefined();
	});

	it('leaves out a status name the platform would refuse, and keeps everything else', () => {
		expect(bulkChangesForPlatform({ taskStatusId: 's1', status: 'QA' })).toEqual({ taskStatusId: 's1' });
		expect(bulkChangesForPlatform({ taskStatusId: 's1', status: 'done' })).toEqual({
			taskStatusId: 's1',
			status: 'done'
		});
		expect(bulkChangesForPlatform({ status: null, taskStatusId: null })).toEqual({
			status: null,
			taskStatusId: null
		});
		expect(bulkChangesForPlatform({ priority: 'high', projectId: 'p1' })).toEqual({
			priority: 'high',
			projectId: 'p1'
		});
	});

	it('drops an undo item left with nothing to change, which would refuse the whole undo', () => {
		expect(
			bulkItemsForPlatform([
				{ taskId: 't1', changes: { taskStatusId: 's0', status: 'Legacy name' } },
				{ taskId: 't2', changes: { status: 'Legacy name' } },
				{ taskId: 't3', changes: { taskStatusId: 's0', status: 'open' } }
			])
		).toEqual([
			{ taskId: 't1', changes: { taskStatusId: 's0' } },
			{ taskId: 't3', changes: { taskStatusId: 's0', status: 'open' } }
		]);
	});
});
