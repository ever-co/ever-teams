import {
  ILoginReponse,
  IRegisterDataAPI,
} from "@app/interfaces/IAuthentication";
import api from "../axios";

const signInWithEmailAndPassword = (email: string, password: string) => {
  return api.post<ILoginReponse>(`/auth/login`, {
    email,
    password,
  });
};

const registerUserTeamAPI = (data: IRegisterDataAPI) => {
  return api.post<ILoginReponse>("/auth/register", data);
};

const getAuthenticatedUserDataAPI = () => {
  return api.get<Pick<ILoginReponse, "user">>(`/user/me`);
};

export {
  signInWithEmailAndPassword,
  registerUserTeamAPI,
  getAuthenticatedUserDataAPI,
};
