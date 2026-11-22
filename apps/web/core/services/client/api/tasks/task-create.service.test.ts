/**
 * A field the caller of `createTask` leaves out keeps the service's default in both API modes (#5712). The plan
 * editor's "Create" and the task pickers send no tags: in proxy mode the body goes out as JSON, so the app's own route
 * fills its defaults, while direct mode used to spread `tags: undefined` over its own `tags: []` and refuse the payload
 * before any request left the browser.
 */
// apps/web/.env sets NEXT_PUBLIC_GAUZY_API_SERVER_URL, which would otherwise decide the API mode of every case.
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getActiveTeamIdCookie: () => 'team-harbor-ops',
	getOrganizationIdCookie: () => 'organization-1',
	getTenantIdCookie: () => 'tenant-1',
	getActiveProjectIdCookie: () => 'project-active'
}));

const mockProxyPost = jest.fn();

jest.mock('@/core/services/client/axios', () => ({
	getAPI: async () => ({ post: (...args: unknown[]) => mockProxyPost(...args) })
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type { TCreateTask } from '@/core/types/schemas/task/task.schema';
import { taskService } from './task.service';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };

const TEAM_TASKS = { items: [], total: 0 };

/** What useCreateTask hands the service for the plan editor's "Create": every field it names, set or not. */
function planEditorTask(fields: Partial<TCreateTask> = {}) {
	return {
		title: 'Renew the parking permits',
		issueType: 'Bug',
		status: 'open',
		priority: undefined,
		size: undefined,
		tags: undefined,
		projectId: undefined,
		members: [],
		taskStatusId: 'status-open',
		...fields
	};
}

/** The body of the one task creation sent to Gauzy. */
async function bodySentToGauzy(task: ReturnType<typeof planEditorTask>) {
	const post = jest.spyOn(taskService, 'post').mockResolvedValue({ data: { id: 'task-new' } } as never);
	jest.spyOn(taskService, 'getTasks').mockResolvedValue(TEAM_TASKS as never);

	await expect(taskService.createTask(task)).resolves.toBe(TEAM_TASKS);

	expect(post).toHaveBeenCalledTimes(1);
	expect(post.mock.calls[0][0]).toBe('/tasks');
	return post.mock.calls[0][1] as Record<string, unknown>;
}

afterEach(() => {
	jest.restoreAllMocks();
	publishedApiOrigin.value = undefined;
});

describe('taskService.createTask in direct mode', () => {
	beforeEach(() => {
		publishedApiOrigin.value = 'https://api.example.test';
	});

	it('creates a task its caller gave no tags, with none (#5712)', async () => {
		const body = await bodySentToGauzy(planEditorTask());

		expect(body).toEqual(
			expect.objectContaining({
				title: 'Renew the parking permits',
				tags: [],
				teams: [{ id: 'team-harbor-ops' }],
				taskStatusId: 'status-open'
			})
		);
	});

	it("files a task its caller gave no project under the active project, as the app's own route does", async () => {
		const body = await bodySentToGauzy(planEditorTask({ tags: [] }));

		expect(body.projectId).toBe('project-active');
	});

	it('keeps the tags and the empty project its caller chose', async () => {
		const body = await bodySentToGauzy(planEditorTask({ tags: [{ id: 'tag-urgent' }], projectId: null }));

		expect(body.tags).toEqual([{ id: 'tag-urgent' }]);
		expect(body.projectId).toBeNull();
	});
});

describe('taskService.createTask in proxy mode', () => {
	it("posts the caller's fields to the app's own route, which fills the defaults", async () => {
		mockProxyPost.mockResolvedValue({ data: TEAM_TASKS });
		const task = planEditorTask();

		await expect(taskService.createTask(task)).resolves.toEqual(TEAM_TASKS);

		expect(mockProxyPost).toHaveBeenCalledWith('/tasks/team', task);
	});
});
