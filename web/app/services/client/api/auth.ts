import {
  ILoginReponse,
  IRegisterDataAPI,
} from "@app/interfaces/IAuthentication";
import api from "../axios";

export const signInWithEmailAndPassword = (email: string, password: string) => {
  return api.post<ILoginReponse>(`/auth/login`, {
    email,
    password,
  });
};

export const registerUserTeamAPI = (data: IRegisterDataAPI) => {
  return api.post<ILoginReponse>("/auth/register", data);
};

export const getAuthenticatedUserDataAPI = () => {
  return api.get<Pick<ILoginReponse, "user">>(`/user/me`);
};
