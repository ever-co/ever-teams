import {
	bulkChangesForPlatform,
	bulkItemsForPlatform,
	bulkRecordChangesOf,
	bulkStatusNameOf,
	PLATFORM_TASK_PRIORITIES,
	PLATFORM_TASK_SIZES,
	PLATFORM_TASK_STATUSES,
	previousCannotBeRestored
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
		expect(bulkChangesForPlatform({ taskStatusId: 's1', status: '' })).toEqual({ taskStatusId: 's1' });
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

	it('tells an undo item whose previous status cannot be put back: a name the platform does not take, and no id', () => {
		expect(previousCannotBeRestored({ taskId: 't1', changes: { status: 'Legacy name', priority: 'high' } })).toBe(
			true
		);
		expect(previousCannotBeRestored({ taskId: 't1', changes: { status: 'Legacy name', taskStatusId: 's0' } })).toBe(
			false
		);
		expect(previousCannotBeRestored({ taskId: 't1', changes: { status: 'open' } })).toBe(false);
		expect(previousCannotBeRestored({ taskId: 't1', changes: { status: null, priority: 'high' } })).toBe(false);
	});

	it('knows the platform’s own priority and size names', () => {
		expect([...PLATFORM_TASK_PRIORITIES]).toEqual(['urgent', 'high', 'medium', 'low']);
		expect([...PLATFORM_TASK_SIZES]).toEqual(['x-large', 'large', 'medium', 'small', 'tiny']);
	});

	it('gives a priority or size by its id, with its value only when the platform takes it', () => {
		expect(bulkRecordChangesOf('priority', { id: 'p-high', value: 'high', name: 'High' })).toEqual({
			taskPriorityId: 'p-high',
			priority: 'high'
		});
		// A team's own priority: the route would refuse the name, so its id alone says which one.
		expect(bulkRecordChangesOf('priority', { id: 'p-0', value: 'p0', name: 'P0' })).toEqual({
			taskPriorityId: 'p-0'
		});
		expect(bulkRecordChangesOf('size', { id: 'z-huge', value: 'huge' })).toEqual({ taskSizeId: 'z-huge' });
		expect(bulkRecordChangesOf('size', { id: 'z-xl', value: 'x-large' })).toEqual({
			taskSizeId: 'z-xl',
			size: 'x-large'
		});
		// No id: a platform value still goes by name; anything else cannot be sent in bulk at all.
		expect(bulkRecordChangesOf('size', { value: 'tiny' })).toEqual({ size: 'tiny' });
		expect(bulkRecordChangesOf('priority', { value: 'p0' })).toBeNull();
	});

	it('leaves out a priority or size name the platform would refuse, keeping the id and null', () => {
		expect(
			bulkChangesForPlatform({ taskPriorityId: 'p-0', priority: 'p0', taskSizeId: 'z-1', size: 'huge' })
		).toEqual({
			taskPriorityId: 'p-0',
			taskSizeId: 'z-1'
		});
		expect(bulkChangesForPlatform({ priority: null, size: null })).toEqual({ priority: null, size: null });
		expect(bulkChangesForPlatform({ priority: 'low', size: 'tiny' })).toEqual({ priority: 'low', size: 'tiny' });
	});

	it('tells an undo item whose previous priority or size cannot be put back: a name alone the platform does not take', () => {
		expect(previousCannotBeRestored({ taskId: 't1', changes: { priority: 'p0', taskPriorityId: null } })).toBe(
			true
		);
		expect(previousCannotBeRestored({ taskId: 't1', changes: { size: 'huge' } })).toBe(true);
		// With its id, the platform gives the task the record's name back.
		expect(previousCannotBeRestored({ taskId: 't1', changes: { priority: 'p0', taskPriorityId: 'p-0' } })).toBe(
			false
		);
		expect(previousCannotBeRestored({ taskId: 't1', changes: { size: 'huge', taskSizeId: 'z-1' } })).toBe(false);
		expect(previousCannotBeRestored({ taskId: 't1', changes: { priority: 'low', taskPriorityId: null } })).toBe(
			false
		);
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
