import {
  ILoginReponse,
  IRegisterDataRequest,
} from "../../interfaces/IAuthentication";
import { IUser } from "../../interfaces/IUserData";
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

type IUEmployeeParam = {
  bearer_token: string;
  relations?: string[];
};

export const currentAuthenticatedUserRequest = ({
  bearer_token,
  relations = ["employee", "role", "tenant"],
}: IUEmployeeParam) => {
  const params = {} as { [x: string]: string };

  relations.forEach((rl, i) => {
    params[`relations[${i}]`] = rl;
  });

  const query = new URLSearchParams(params);

  return serverFetch<IUser>({
    path: `/user/me?${query.toString()}`,
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

export function sendAuthCodeRequest(email: string) {
	return serverFetch<{ status: number; message: string | 'ok' }>({
		path: '/auth/send-code',
		method: 'POST',
		body: { email },
	});
}

export function verifyAuthCodeRequest(email: string, code: number) {
	return serverFetch<ILoginReponse>({
		path: '/auth/verify-code',
		method: 'POST',
		body: { email, code },
	});
}