import {
	getActiveProjectIdCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@/core/lib/helpers/cookies';
import { APIService, getFallbackAPI } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, ICreateTask, ITask, PaginationResponse } from '@/core/types/interfaces/to-review';

class TaskService extends APIService {
	getTaskById = async (taskId: string) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const relations = [
			'tags',
			'teams',
			'members',
			'members.user',
			'createdByUser',
			'linkedIssues',
			'linkedIssues.taskTo',
			'linkedIssues.taskFrom',
			'parent',
			'children'
		];

		const obj = {
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId,
			'join[alias]': 'task',
			'join[leftJoinAndSelect][members]': 'task.members',
			'join[leftJoinAndSelect][user]': 'members.user',
			includeRootEpic: 'true'
		} as Record<string, string>;

		relations.forEach((rl, i) => {
			obj[`relations[${i}]`] = rl;
		});

		const query = qs.stringify(obj);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/tasks/${taskId}?${query}` : `/tasks/${taskId}`;

		return this.get<ITask>(endpoint);
	};

	getTasks = async (organizationId: string, tenantId: string, projectId: string, teamId: string) => {
		const relations = [
			'tags',
			'teams',
			'members',
			'members.user',
			'createdByUser',
			'linkedIssues',
			'linkedIssues.taskTo',
			'linkedIssues.taskFrom',
			'parent',
			'children'
		];

		const obj = {
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId,
			'where[projectId]': projectId,
			'join[alias]': 'task',
			'join[leftJoinAndSelect][members]': 'task.members',
			'join[leftJoinAndSelect][user]': 'members.user',
			'where[teams][0]': teamId
		} as Record<string, string>;

		relations.forEach((rl, i) => {
			obj[`relations[${i}]`] = rl;
		});

		const query = qs.stringify(obj);
		const endpoint = `/tasks/team?${query}`;

		return this.get<PaginationResponse<ITask>>(endpoint, { tenantId });
	};

	deleteTask = async (taskId: string) => {
		return this.delete<DeleteResponse>(`/tasks/${taskId}`);
	};

	updateTask = async (taskId: string, body: Partial<ITask>) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			const tenantId = getTenantIdCookie();
			const organizationId = getOrganizationIdCookie();
			const teamId = getActiveTeamIdCookie();
			const projectId = getActiveProjectIdCookie();

			const nBody = { ...body };
			delete nBody.selectedTeam;
			delete nBody.rootEpic;

			await this.put(`/tasks/${taskId}`, nBody);

			return this.getTasks(organizationId, tenantId, projectId, teamId);
		}

		return this.put<PaginationResponse<ITask>>(`/tasks/${taskId}`, body);
	};

	createTask = async (body: Partial<ICreateTask> & { title: string }) => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			const organizationId = getOrganizationIdCookie();
			const teamId = getActiveTeamIdCookie();
			const tenantId = getTenantIdCookie();
			const projectId = getActiveProjectIdCookie();
			const title = body.title.trim() || '';

			const datas: ICreateTask = {
				description: '',
				teams: [
					{
						id: teamId
					}
				],
				tags: [],
				organizationId,
				tenantId,
				projectId,
				estimate: 0,
				...body,
				title // this must be called after ...body
			};

			await this.post('/tasks', datas, { tenantId });

			return this.getTasks(organizationId, tenantId, projectId, teamId);
		}
		const api = await getFallbackAPI();
		return api.post<PaginationResponse<ITask>>('/tasks/team', body);
	};

	deleteEmployeeFromTasks = async (employeeId: string, organizationTeamId: string) => {
		return this.delete<DeleteResponse>(`/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`);
	};

	getTasksByEmployeeId = async (employeeId: string, organizationTeamId: string) => {
		return this.get<ITask[]>(`/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`);
	};
}

export const taskService = new TaskService(GAUZY_API_BASE_SERVER_URL.value);
