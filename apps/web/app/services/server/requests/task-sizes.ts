import { serverFetch } from '../fetch';

export function getTaskSizesListRequest<ITaskSizesItemList>(
	{ organizationId, tenantId }: { tenantId: string; organizationId: string },
	bearer_token: string
) {
	return serverFetch({
		path: `/task-sizes?tenantId=${tenantId}&organizationId=${organizationId}`,
		method: 'GET',
		bearer_token,
	});
}
