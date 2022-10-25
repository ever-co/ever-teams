import {
  ILoginReponse,
  IRegisterDataAPI,
} from "@app/interfaces/IAuthentication";
import { IDataResponse } from "@app/interfaces/IDataResponse";
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

const getUserDataAPI = (): Promise<IDataResponse> => {
  return api.get(`/auth/user-data`);
};

export { signInWithEmailAndPassword, registerUserTeamAPI, getUserDataAPI };
