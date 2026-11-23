import type { TTask } from '@/core/types/schemas/task/task.schema';
import { cachedTeamTaskOf } from './cached-team-task';

const task = (id: string) => ({ id, title: `Task ${id}`, members: [] }) as never as TTask;

describe('cachedTeamTaskOf (#5714)', () => {
	it('finds a task in the paged list the team task query keeps', () => {
		const paged = { pages: [{ items: [task('1'), task('2')], total: 3 }, { items: [task('3')], total: 3 }], pageParams: [1, 2] };

		expect(cachedTeamTaskOf(paged, '3')?.title).toBe('Task 3');
		expect(cachedTeamTaskOf(paged, '1')?.title).toBe('Task 1');
	});

	it('finds a task in a list kept as one page', () => {
		expect(cachedTeamTaskOf({ items: [task('1')], total: 1 }, '1')?.title).toBe('Task 1');
	});

	it.each([
		['a list that is not loaded', undefined],
		['a list that does not hold the task', { pages: [{ items: [task('1')], total: 1 }], pageParams: [1] }],
		['a page without items', { pages: [{}], pageParams: [1] }]
	])('finds nothing in %s', (_case, cached) => {
		expect(cachedTeamTaskOf(cached, '9')).toBeUndefined();
	});
});
