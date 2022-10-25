import { IRegisterDataAPI } from "@app/interfaces/IAuthentication";
import { IDataResponse } from "@app/interfaces/IDataResponse";
import { IUser } from "@app/interfaces/IUserData";
import { AxiosResponse } from "axios";
import api from "../axios";

const signInWithEmailAndPassword = (
  email: string,
  password: string
): Promise<IDataResponse> => {
  return api.post(`/auth/login`, {
    email,
    password,
  });
};

const registerUserTeamAPI = (
  data: IRegisterDataAPI
): Promise<AxiosResponse<IUser>> => {
  return api.post("/auth/register", data);
};

const getUserDataAPI = (): Promise<IDataResponse> => {
  return api.get(`/auth/user-data`);
};

export { signInWithEmailAndPassword, registerUserTeamAPI, getUserDataAPI };
