import { ILoginReponse } from "@app/interfaces/IAuthentication";
import { IRegisterData, IUser } from "@app/interfaces/IUserData";
import { serverFetch } from "../fetch";

export const registerUserRequest = (data: IRegisterData) => {
  return serverFetch<IUser>("/auth/register", "POST", data);
};

export const loginUserRequest = (email: string, password: string) => {
  return serverFetch<ILoginReponse>("/auth/login", "POST", {
    email,
    password,
  });
};

export const whetherUserAuthenticatedRequest = (bearer_token: string) => {
  return serverFetch<boolean>("/user/authenticated", "GET", {}, bearer_token);
};

export const currentAuthenticatedUserRequest = (bearer_token: string) => {
  return serverFetch<IUser>("/user/me", "GET", {}, bearer_token);
};
