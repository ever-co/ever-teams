import {
	bulkChangesForPlatform,
	bulkItemsForPlatform,
	bulkRecordChangesOf,
	bulkStatusNameOf,
	listedRecordIdOf,
	PLATFORM_TASK_PRIORITIES,
	PLATFORM_TASK_SIZES,
	PLATFORM_TASK_STATUSES,
	previousCannotBeRestored,
	recordChangeOf
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

	it('tells an undo item whose previous priority or size cannot be put back: a name it must leave out', () => {
		expect(previousCannotBeRestored({ taskId: 't1', changes: { priority: 'p0', taskPriorityId: null } })).toBe(
			true
		);
		expect(previousCannotBeRestored({ taskId: 't1', changes: { size: 'huge' } })).toBe(true);
		// The platform answers a team's own name only when the record beside it would not give it back.
		expect(previousCannotBeRestored({ taskId: 't1', changes: { priority: 'p0', taskPriorityId: 'p-0' } })).toBe(
			true
		);
		// A record alone (the platform left out the name it gives back), or a name the platform takes, goes back whole.
		expect(previousCannotBeRestored({ taskId: 't1', changes: { taskPriorityId: 'p-0' } })).toBe(false);
		expect(previousCannotBeRestored({ taskId: 't1', changes: { taskSizeId: 'z-1' } })).toBe(false);
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

describe('one task’s priority or size, with its record', () => {
	it('names the record the menu lists a priority or a size by, and none when no record lists it', () => {
		const items = { p0: { id: 'p-0', value: 'p0' }, high: { id: 'p-high' }, legacy: {} };
		expect(listedRecordIdOf('priority', items, 'p0')).toBe('p-0');
		expect(listedRecordIdOf('size', items, 'high')).toBe('p-high');
		expect(listedRecordIdOf('priority', items, 'legacy')).toBeNull();
		expect(listedRecordIdOf('priority', items, 'nowhere')).toBeNull();
		// A status, a label or a version is saved as before.
		expect(listedRecordIdOf('status', items, 'p0')).toBeUndefined();
		expect(listedRecordIdOf('version', items, 'p0')).toBeUndefined();
	});

	it('gives a task a team’s own priority or size by its value and its record together', () => {
		const task = { priority: 'low', taskPriorityId: 'p-low', size: null, taskSizeId: null };
		expect(recordChangeOf('priority', task, { value: 'p0', id: 'p-0' })).toEqual({
			priority: 'p0',
			taskPriorityId: 'p-0'
		});
		expect(recordChangeOf('size', task, { value: 'huge', id: 'z-huge' })).toEqual({
			size: 'huge',
			taskSizeId: 'z-huge'
		});
	});

	it('moves a task to another record of the same name, and clears a record no longer listed', () => {
		const task = { priority: 'p0', taskPriorityId: 'p-0-old' };
		expect(recordChangeOf('priority', task, { value: 'p0', id: 'p-0' })).toEqual({
			priority: 'p0',
			taskPriorityId: 'p-0'
		});
		expect(recordChangeOf('priority', task, { value: 'p0', id: null })).toEqual({
			priority: 'p0',
			taskPriorityId: null
		});
	});

	it('changes nothing when the task already has both', () => {
		expect(
			recordChangeOf('priority', { priority: 'p0', taskPriorityId: 'p-0' }, { value: 'p0', id: 'p-0' })
		).toBeNull();
		expect(recordChangeOf('size', { size: 'tiny' }, { value: 'tiny' })).toBeNull();
	});
});
