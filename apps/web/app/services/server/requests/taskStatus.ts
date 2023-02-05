import { serverFetch } from '../fetch';

export function getTaskStatusListRequest<ITaskStatusItemList>(
	{ organizationId, tenantId }: { tenantId: string; organizationId: string },
	bearer_token: string
) {
	return serverFetch({
		path: `/task-statuses?tenantId=${tenantId}&organizationId=${organizationId}`,
		method: 'GET',
		bearer_token,
	});
}
