import {
  ILoginResponse,
  IRegisterDataRequest,
  ISuccessResponse,
} from "../../interfaces/IAuthentication";
import { IUser } from "../../interfaces/IUserData";
import { serverFetch } from "../fetch";

const registerDefaultValue = {
  appName: 'Gauzy Teams',
  appSignature: 'Ever Gauzy Team',
  appLogo: 'https://app.gauzy.team/assets/gauzy-team.png',
  appLink: 'https://gauzy.team/',
  appEmailConfirmationUrl: 'https://app.gauzy.co/#/auth/confirm-email',
};

export const registerUserRequest = (data: IRegisterDataRequest) => {

  const body = {
    ...data,
    ...registerDefaultValue,
  };

  return serverFetch<IUser>({
    path: "/auth/register",
    method: "POST",
    body,
  });
};

export const loginUserRequest = (email: string, password: string) => {
  return serverFetch<ILoginResponse>({
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
  return serverFetch<ILoginResponse>({
    path: '/auth/verify-code',
    method: 'POST',
    body: { email, code },
  });
}

export const verifyUserEmailByCodeRequest = (data: {
  bearer_token: string;
  code: number;
  email: string;
  tenantId: string;
}) => {
  const { code, email, bearer_token, tenantId } = data;
  return serverFetch<ISuccessResponse>({
    path: '/auth/email/verify/code',
    method: 'POST',
    body: { code, email, tenantId },
    tenantId: data.tenantId,
    bearer_token,
  });
};

export const resentVerifyUserLinkRequest = (data: {
  bearer_token: string;
  email: string;
  tenantId: string;
}) => {
  const { email, bearer_token, tenantId } = data;

  return serverFetch<ISuccessResponse>({
    path: '/auth/email/verify/resend-link',
    method: 'POST',
    body: { email, tenantId },
    tenantId: data.tenantId,
    bearer_token,
  });
};
