import { ITaskLabelsCreate, ITaskLabelsItemList } from '@app/interfaces';
import { serverFetch } from '../fetch';

export function createLabelsRequest(
	datas: ITaskLabelsCreate,
	bearer_token: string,
	tenantId?: any
) {
	return serverFetch<ITaskLabelsItemList>({
		path: '/tags',
		method: 'POST',
		body: datas,
		bearer_token,
		tenantId,
	});
}

export function editTaskLabelsRequest({
	id,
	datas,
	bearer_token,
	tenantId,
}: {
	id: string | any;
	datas: ITaskLabelsCreate;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<ITaskLabelsItemList>({
		path: `/tags/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId,
	});
}

export function deleteTaskLabelsRequest({
	id,
	bearer_token,
	tenantId,
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: any;
}) {
	return serverFetch<ITaskLabelsItemList>({
		path: `/tags/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId,
	});
}

export function getTaskLabelsListRequest<ITaskStatusItemList>(
	{ organizationId, tenantId }: { tenantId: string; organizationId: string },
	bearer_token: string
) {
	const data = `{"relations":["organization"],"findInput":{"tenantId":"${tenantId}","organizationId":"${organizationId}"}}`;

	return serverFetch({
		path: `/tags?data=${encodeURI(data)}`,
		method: 'GET',
		bearer_token,
	});
}
