import { taskService } from './task.service';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const STOP = new Error('request captured');

/** The body of the one PUT the update sends; the request itself is stopped once it is captured. */
async function bodyOfUpdate(data: Partial<TTask>) {
	const put = jest.spyOn(taskService, 'put').mockRejectedValue(STOP);
	await expect(taskService.updateTask({ taskId: 'task-1', data })).rejects.toBe(STOP);
	expect(put).toHaveBeenCalledTimes(1);
	return put.mock.calls[0][1] as Record<string, unknown>;
}

describe('taskService.updateTask — the project the task detail reads', () => {
	afterEach(() => jest.restoreAllMocks());

	it('removes the project with projectId null and never writes the project it read back (#5385)', async () => {
		const body = await bodyOfUpdate({
			title: 'Homepage',
			projectId: null,
			project: { id: 'project-1', name: 'Website' }
		} as Partial<TTask>);

		expect(body).toEqual(expect.objectContaining({ title: 'Homepage', projectId: null }));
		expect(body).not.toHaveProperty('project');
	});

	it('moves the task by its projectId alone', async () => {
		const body = await bodyOfUpdate({
			projectId: 'project-2',
			project: { id: 'project-1', name: 'Website' }
		} as Partial<TTask>);

		expect(body).toEqual(expect.objectContaining({ projectId: 'project-2' }));
		expect(body).not.toHaveProperty('project');
	});
});
