import {
  ILoginReponse,
  IRegisterDataRequest,
} from "@app/interfaces/IAuthentication";
import { IUser } from "@app/interfaces/IUserData";
import { serverFetch } from "../fetch";

export const registerUserRequest = (data: IRegisterDataRequest) => {
  return serverFetch<IUser>({
    path: "/auth/register",
    method: "POST",
    body: data,
  });
};

export const loginUserRequest = (email: string, password: string) => {
  return serverFetch<ILoginReponse>({
    path: "/auth/login",
    method: "POST",
    body: {
      email,
      password,
    },
  });
};

export const whetherUserAuthenticatedRequest = (bearer_token: string) => {
  return serverFetch<boolean>({
    path: "/user/authenticated",
    method: "GET",
    bearer_token,
  });
};

export const currentAuthenticatedUserRequest = (bearer_token: string) => {
  return serverFetch<IUser>({
    path: "/user/me",
    method: "GET",
    bearer_token,
  });
};

export const refreshTokenRequest = (refresh_token: string) => {
  return serverFetch<{ token: string }>({
    path: "/auth/refresh-token",
    method: "POST",
    body: {
      refresh_token,
    },
  });
};
