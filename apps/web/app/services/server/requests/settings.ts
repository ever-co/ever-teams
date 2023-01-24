  import { serverFetch } from "../fetch";
  
  export function updateUserAvatarRequest<IUser>(
    { data, id, tenantId }: { data: IUser; id: string; tenantId: string},
    bearer_token: string
  ) {

    // const init = {};
    return serverFetch({
      path: `/user/${id}`,
      method: "PUT",
      body: data,
      bearer_token,
      tenantId
    });
  }
  