import { ITaskRelatedIssueType } from '@/core/types/interfaces/task/related-issue-type';
import { ITaskRelatedIssueTypeCreate } from '@/core/types/interfaces/task/related-issue-type';
import { serverFetch } from '../fetch';

export function createRelatedIssueTypeRequest(
	datas: ITaskRelatedIssueTypeCreate,
	bearer_token: string,
	tenantId?: any
) {
	return serverFetch<ITaskRelatedIssueType>({
		path: '/task-related-issue-types',
		method: 'POST',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function editTaskRelatedIssueTypeRequest({
	id,
	datas,
	bearer_token,
	tenantId
}: {
	id: string | any;
	datas: ITaskRelatedIssueTypeCreate;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<ITaskRelatedIssueType>({
		path: `/task-related-issue-types/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function deleteTaskRelatedIssueTypeRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: any;
}) {
	return serverFetch<ITaskRelatedIssueType>({
		path: `/task-related-issue-types/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function getTaskRelatedIssueTypeListRequest(
	{
		organizationId,
		tenantId,
		organizationTeamId,
		projectId
	}: {
		tenantId: string;
		organizationId: string;
		organizationTeamId: string | null;
		projectId?: string | null;
	},
	bearer_token: string
) {
	const query = new URLSearchParams({
		tenantId,
		organizationId,
		organizationTeamId: organizationTeamId ?? 'null'
	});
	if (projectId !== undefined && projectId !== null) query.set('projectId', projectId);

	return serverFetch({
		path: `/task-related-issue-types?${query}`,
		method: 'GET',
		bearer_token
	});
}
