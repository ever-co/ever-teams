import { PaginationResponse } from "../../interfaces/IDataResponse";
import { ITaskPriorityCreate, ITaskPriorityItem } from "../../interfaces/ITaskPriority";
import { serverFetch } from "../fetch";

export function createPriorityRequest(
    { datas, bearer_token, tenantId }:
    {
        datas: ITaskPriorityCreate,
        bearer_token: string,
        tenantId?: any
    }
) {
    return serverFetch<ITaskPriorityItem>({
        path: '/task-priorities',
        method: 'POST',
        body: datas,
        bearer_token,
        tenantId,
    });
}

export function updateTaskPriorityRequest({
    id,
    datas,
    bearer_token,
    tenantId,
}: {
    id: string | any;
    datas: ITaskPriorityCreate;
    bearer_token: string;
    tenantId?: any;
}) {
    return serverFetch<ITaskPriorityItem>({
        path: `/task-priorities/${id}`,
        method: 'PUT',
        body: datas,
        bearer_token,
        tenantId,
    });
}

export function deleteTaskPriorityRequest({
    id,
    bearer_token,
    tenantId,
}: {
    id: string | any;
    bearer_token: string | any;
    tenantId?: any;
}) {
    return serverFetch<ITaskPriorityItem>({
        path: `/task-priorities/${id}`,
        method: 'DELETE',
        bearer_token,
        tenantId,
    });
}

export function getTaskAllPrioritiesRequest(
    { organizationId, tenantId }: { tenantId: string; organizationId: string },
    bearer_token: string
) {
    return serverFetch<PaginationResponse<ITaskPriorityItem>>({
        path: `/task-priorities?tenantId=${tenantId}&organizationId=${organizationId}`,
        method: 'GET',
        bearer_token,
    });
}
