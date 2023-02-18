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
