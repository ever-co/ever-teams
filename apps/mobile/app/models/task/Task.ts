import { types } from 'mobx-state-tree';
import { ITeamTask } from '../../services/interfaces/ITask';

export interface ITaskCreateParams {
	taskTitle: string;
	teamId: string;
	organizationId: string;
	tenantId: string;
	authToken: string;
}

export interface ITaskGetParams {
	organizationId: string;
	tenantId: string;
	authToken: string;
	activeTeamId: string;
}

export interface ITaskDeleteParams {
	tenantId: string;
	taskId: string;
	organizationId: string;
	activeTeamId: string;
	authToken: string;
}

export interface ITaskUpdateParams {
	taskId: string;
	taskData: ITeamTask;
	authToken: string;
	refreshData: {
		activeTeamId: string;
		tenantId: string;
		organizationId: string;
	};
}

interface IFilterTask {
	tasks: ITeamTask[];
	activeTeamId: string;
}

export const getTasksByTeamState = (params: IFilterTask) => {
	if (!params.tasks) return [];
	const data = params.tasks.filter((task) => {
		return task.teams.some((tm) => {
			return tm.id === params.activeTeamId;
		});
	});

	return data;
};
