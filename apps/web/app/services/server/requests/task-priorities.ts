import { serverFetch } from '../fetch';

export function getTaskPrioritiesListRequest<ITaskStatusItemList>(
	{ organizationId, tenantId }: { tenantId: string; organizationId: string },
	bearer_token: string
) {
	return serverFetch({
		path: `/task-priorities?tenantId=${tenantId}&organizationId=${organizationId}`,
		method: 'GET',
		bearer_token,
	});
}
