import { IUser } from "../../interfaces/IUserData";
import { serverFetch } from "../fetch";

export function updateUserInfoRequest(
    { data, id, tenantId }: { data: IUser; id: string; tenantId: string },
    bearer_token: string
) {
    return serverFetch<IUser>({
        path: `/user/${id}`,
        method: "PUT",
        body: data,
        bearer_token,
        tenantId
    });
}

export function deleteUserRequest({
    id,
    bearer_token,
    tenantId,
}: {
    id: string | any;
    bearer_token: string | any;
    tenantId?: string;
}) {
    return serverFetch<any>({
        path: `/user/${id}`,
        method: 'DELETE',
        bearer_token,
        tenantId,
    });
}

export function resetUserRequest({
    bearer_token,
    tenantId,
}: {
    bearer_token: string | any;
    tenantId?: string;
}) {
    return serverFetch<any>({
        path: `/user/reset`,
        method: 'DELETE',
        bearer_token,
        tenantId,
    });
}