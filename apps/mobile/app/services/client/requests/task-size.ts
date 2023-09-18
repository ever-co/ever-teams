import { PaginationResponse } from "../../interfaces/IDataResponse"
import { ITaskSizeCreate, ITaskSizeItem } from "../../interfaces/ITaskSize"
import { serverFetch } from "../fetch"

export function createSizeRequest({
	datas,
	tenantId,
	bearer_token,
}: {
	datas: ITaskSizeCreate
	bearer_token: string
	tenantId?: any
}) {
	return serverFetch<ITaskSizeItem>({
		path: "/task-sizes",
		method: "POST",
		body: datas,
		bearer_token,
		tenantId,
	})
}

export function updateTaskSizesRequest({
	id,
	datas,
	bearer_token,
	tenantId,
}: {
	id: string | any
	datas: ITaskSizeCreate
	bearer_token: string
	tenantId?: any
}) {
	return serverFetch<ITaskSizeItem>({
		path: `/task-sizes/${id}`,
		method: "PUT",
		body: datas,
		bearer_token,
		tenantId,
	})
}

export function deleteTaskSizeRequest({
	id,
	bearer_token,
	tenantId,
}: {
	id: string | any
	bearer_token: string | any
	tenantId?: any
}) {
	return serverFetch<ITaskSizeItem>({
		path: `/task-sizes/${id}`,
		method: "DELETE",
		bearer_token,
		tenantId,
	})
}

export function getAllTaskSizesRequest(
	{
		organizationId,
		tenantId,
		activeTeamId,
	}: { tenantId: string; organizationId: string; activeTeamId: string },
	bearer_token: string,
) {
	return serverFetch<PaginationResponse<ITaskSizeItem>>({
		path: `/task-sizes?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${activeTeamId}`,
		method: "GET",
		bearer_token,
	})
}
