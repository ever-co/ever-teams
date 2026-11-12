import { QueryClient, type QueryKey } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { showTaskChangeInBuiltInViews } from './built-in-view-task-cache';

const builtInKey = (key: string) => queryKeys.taskViews.builtIn('tenant-1', 'organization-1', 'user-1', key);
const mineKey = builtInKey('mine');
const overdueKey = builtInKey('overdue');
const dueSoonKey = builtInKey('due-soon');

const task = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: id, ...extra }) as unknown as TTask;
const viewOf = (...tasks: TTask[]) => ({ items: tasks, total: tasks.length });

function listedTask(queryClient: QueryClient, key: QueryKey, taskId: string) {
	const view = queryClient.getQueryData<{ items: TTask[] }>(key);
	const tasks = view?.items ?? [];
	return tasks.find((item) => item.id === taskId);
}

describe('a task change shown in the built-in views', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient();
	});

	it('shows the change in every built-in view that lists the task, and leaves every other list as it is', () => {
		const savedViewsKey = queryKeys.taskViews.list('tenant-1', 'organization-1', 'team-1', 'user-1');
		queryClient.setQueryData(mineKey, viewOf(task('a', { status: 'todo' }), task('b')));
		queryClient.setQueryData(overdueKey, viewOf(task('a', { status: 'todo' })));
		queryClient.setQueryData(dueSoonKey, viewOf(task('b')));
		queryClient.setQueryData(savedViewsKey, { items: [{ id: 'a', name: 'Sprint' }], total: 1 });
		const dueSoonBefore = queryClient.getQueryData(dueSoonKey);
		const savedViewsBefore = queryClient.getQueryData(savedViewsKey);

		showTaskChangeInBuiltInViews(queryClient, 'a', { status: 'done' } as Partial<TTask>);

		expect(listedTask(queryClient, mineKey, 'a')).toMatchObject({ status: 'done' });
		expect(listedTask(queryClient, overdueKey, 'a')).toMatchObject({ status: 'done' });
		expect(queryClient.getQueryData(dueSoonKey)).toBe(dueSoonBefore);
		expect(queryClient.getQueryData(savedViewsKey)).toBe(savedViewsBefore);
	});

	it("keeps what the view's copy of the task holds besides the change, and the other tasks of the view", () => {
		const project = { id: 'p1', name: 'Website' };
		queryClient.setQueryData(
			mineKey,
			viewOf(task('a', { status: 'todo', project }), task('b', { status: 'todo' }))
		);

		showTaskChangeInBuiltInViews(queryClient, 'a', { status: 'done', taskStatusId: 's2' } as Partial<TTask>);

		expect(queryClient.getQueryData(mineKey)).toEqual(
			viewOf(task('a', { status: 'done', taskStatusId: 's2', project }), task('b', { status: 'todo' }))
		);
	});

	it('puts back the fields the change set as each view listed them, and keeps every change made since', () => {
		const mineCopy = task('a', { status: 'todo', priority: 'low', title: 'Draft' });
		const overdueCopy = task('a', { status: 'todo' });
		queryClient.setQueryData(mineKey, viewOf(mineCopy, task('b', { priority: 'low' })));
		queryClient.setQueryData(overdueKey, viewOf(overdueCopy));

		const restore = showTaskChangeInBuiltInViews(queryClient, 'a', { status: 'done' } as Partial<TTask>);
		showTaskChangeInBuiltInViews(queryClient, 'b', { priority: 'high' } as Partial<TTask>);
		const readWhileSaving = viewOf(
			task('a', { status: 'todo', priority: 'low', title: 'Final' }),
			task('b', { priority: 'high' })
		);
		queryClient.setQueryData(mineKey, readWhileSaving);
		restore();

		expect(listedTask(queryClient, mineKey, 'a')).toEqual(
			task('a', { status: 'todo', priority: 'low', title: 'Final' })
		);
		expect(listedTask(queryClient, overdueKey, 'a')).toEqual(overdueCopy);
		expect(listedTask(queryClient, mineKey, 'b')).toMatchObject({ priority: 'high' });
	});

	it('leaves a view read again since, which no longer lists the task, as it is', () => {
		queryClient.setQueryData(overdueKey, viewOf(task('a', { dueDate: '2026-11-01' }), task('b')));

		const restore = showTaskChangeInBuiltInViews(queryClient, 'a', { dueDate: new Date(2026, 11, 1) });
		queryClient.setQueryData(overdueKey, viewOf(task('b')));
		restore();

		expect(queryClient.getQueryData(overdueKey)).toEqual(viewOf(task('b')));
	});

	it('keeps the change when a read of the view already on its way answers with the task as it was', async () => {
		queryClient.setQueryData(mineKey, viewOf(task('a', { status: 'todo' })));
		let answerRead: (view: unknown) => void = () => undefined;
		const read = queryClient.fetchQuery({
			queryKey: mineKey,
			queryFn: () =>
				new Promise((resolve) => {
					answerRead = resolve;
				})
		});

		showTaskChangeInBuiltInViews(queryClient, 'a', { status: 'done' } as Partial<TTask>);
		answerRead(viewOf(task('a', { status: 'todo' })));
		await read.catch(() => undefined);

		expect(listedTask(queryClient, mineKey, 'a')).toMatchObject({ status: 'done' });
	});
});
