import { PaginationResponse } from "../../interfaces/IDataResponse";
import { ITaskStatusCreate, ITaskStatusItem } from "../../interfaces/ITaskStatus";
import { serverFetch } from "../fetch";

export function createStatusRequest(
	{ datas,
		bearer_token,
		tenantId }: {
			datas: ITaskStatusCreate,
			bearer_token: string,
			tenantId: string
		}
) {
	return serverFetch<ITaskStatusItem>({
		path: '/task-statuses',
		method: 'POST',
		body: datas,
		bearer_token,
		tenantId,
	});
}

export function updateTaskStatusRequest({
	id,
	datas,
	bearer_token,
	tenantId,
}: {
	id: string | any;
	datas: ITaskStatusCreate;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<ITaskStatusItem>({
		path: `/task-statuses/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId,
	});
}

export function deleteTaskStatusRequest({
	id,
	bearer_token,
	tenantId,
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: any;
}) {
	return serverFetch<ITaskStatusItem>({
		path: `/task-statuses/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId,
	});
}

export function getTaskStatusesRequest(
	{ organizationId, tenantId }: { tenantId: string; organizationId: string },
	bearer_token: string
) {
	return serverFetch<PaginationResponse<ITaskStatusItem>>({
		path: `/task-statuses?tenantId=${tenantId}&organizationId=${organizationId}`,
		method: 'GET',
		bearer_token,
	});
}

