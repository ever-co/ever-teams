import qs from 'qs';
import {
	ICreateDailyPlan,
	IDailyPlan,
	IDailyPlanTasksUpdate,
	IRemoveTaskFromManyPlansRequest,
	IUpdateDailyPlan
} from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { serverFetch } from '../fetch';
import { DeleteResponse } from '@/core/types/interfaces/common/data-response';
import { ID } from '@/core/types/interfaces/common/base-interfaces';

export function getAllDayPlans({
	organizationId,
	tenantId,
	organizationTeamId,
	bearer_token,
	// PERF: keep in sync with the client-side DailyPlanService.getAllDayPlans() relation trim.
	// The only caller is the Next.js proxy route (app/api/daily-plan/route.ts:32), which discards the
	// incoming query string and falls back to this default - so without the same ['tasks'] trim the
	// proxy deployment mode would keep fetching employee / tasks.members / tasks.members.user that no
	// consumer reads. The sibling requests below intentionally keep their full relation defaults.
	relations = ['tasks']
}: {
	organizationId: ID;
	tenantId: ID;
	organizationTeamId: ID;
	bearer_token: string;
	relations?: string[];
}) {
	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
		'where[organizationTeamId]': organizationTeamId
	} as Record<string, string>;

	relations.forEach((relation, i) => {
		obj[`relations[${i}]`] = relation;
	});

	const query = qs.stringify(obj);

	return serverFetch<IDailyPlan>({
		path: `/daily-plan?${query}`,
		method: 'GET',
		bearer_token
	});
}

export function getMyDailyPlansRequest({
	organizationId,
	tenantId,
	organizationTeamId,
	bearer_token,
	relations = ['employee', 'tasks', 'employee.user', 'tasks.members', 'tasks.members.user']
}: {
	organizationId: ID;
	tenantId: ID;
	organizationTeamId: ID;
	bearer_token: string;
	relations?: string[];
}) {
	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
		'where[organizationTeamId]': organizationTeamId
	} as Record<string, string>;

	relations.forEach((relation, i) => {
		obj[`relations[${i}]`] = relation;
	});

	const query = qs.stringify(obj);

	return serverFetch<IDailyPlan>({
		path: `/daily-plan/me?${query}`,
		method: 'GET',
		bearer_token
	});
}

export function getDayPlansByEmployee({
	employeeId,
	organizationId,
	tenantId,
	organizationTeamId,
	bearer_token,
	relations = ['employee', 'tasks', 'employee.user', 'tasks.members', 'tasks.members.user']
}: {
	employeeId: ID;
	organizationId: ID;
	tenantId: ID;
	organizationTeamId: ID;
	bearer_token: string;
	relations?: string[];
}) {
	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
		'where[organizationTeamId]': organizationTeamId
	} as Record<string, string>;

	relations.forEach((relation, i) => {
		obj[`relations[${i}]`] = relation;
	});

	const query = qs.stringify(obj);

	return serverFetch<IDailyPlan>({
		path: `/daily-plan/employee/${employeeId}?${query}`,
		method: 'GET',
		bearer_token
	});
}

export function getPlansByTask({
	taskId,
	organizationId,
	tenantId,
	organizationTeamId,
	bearer_token
}: {
	taskId: string;
	organizationId: ID;
	tenantId: ID;
	organizationTeamId: ID;
	bearer_token: string;
}) {
	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
		'where[organizationTeamId]': organizationTeamId
	} as Record<string, string>;

	const query = qs.stringify(obj);

	return serverFetch<IDailyPlan>({
		path: `/daily-plan/task/${taskId}?${query}`,
		method: 'GET',
		bearer_token
	});
}

export function createPlanRequest({
	data,
	bearer_token,
	tenantId
}: {
	data: ICreateDailyPlan;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<IDailyPlan>({
		method: 'POST',
		path: '/daily-plan',
		body: data,
		bearer_token,
		tenantId
	});
}

export function updatePlanRequest({
	planId,
	data,
	bearer_token,
	tenantId
}: {
	planId: string;
	data: IUpdateDailyPlan;
	bearer_token?: string;
	tenantId?: any;
}) {
	return serverFetch<IDailyPlan>({
		method: 'PUT',
		path: `/daily-plan/${planId}`,
		body: data,
		bearer_token,
		tenantId
	});
}

export function addTaskToDailyPlanRequest({
	planId,
	data,
	bearer_token,
	tenantId
}: {
	planId: string;
	data: IDailyPlanTasksUpdate;
	bearer_token?: string;
	tenantId: any;
}) {
	return serverFetch<IDailyPlan>({
		method: 'POST',
		path: `/daily-plan/${planId}/task`,
		body: data,
		bearer_token,
		tenantId
	});
}

export function removeTaskFromPlanRequest({
	planId,
	data,
	bearer_token,
	tenantId
}: {
	planId: string;
	data: IDailyPlanTasksUpdate;
	bearer_token?: string;
	tenantId: any;
}) {
	return serverFetch<IDailyPlan>({
		method: 'PUT',
		path: `/daily-plan/${planId}/task`,
		body: data,
		bearer_token,
		tenantId
	});
}

export function deleteDailyPlanRequest({ planId, bearer_token }: { planId: string; bearer_token?: string }) {
	return serverFetch<DeleteResponse>({
		method: 'DELETE',
		path: `/daily-plan/${planId}`,
		bearer_token
	});
}

export function deleteDailyPlansManyRequest({
	bearer_token,
	taskId,
	data
}: {
	bearer_token?: string;
	taskId: string;
	data: IRemoveTaskFromManyPlansRequest;
}) {
	return serverFetch<IDailyPlan[]>({
		method: 'PUT',
		path: `/daily-plan/${taskId}/remove`,
		body: data,
		bearer_token
	});
}
