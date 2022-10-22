import { removeCookies } from "../../helpers/getCookies";
import { handleResponse, storeUserTokens } from "../../helpers/_helper";
import { IDataResponse } from "../../interfaces/IDataResponse";
import { IRegisterData, IUser, IUserData } from "../../interfaces/IUserData";

import cookie from "js-cookie";
import {
  getUserDataAPI,
  registerUserEmailPassAPI,
  signInWithEmailAndPassword,
} from "./api/auth";

export const login = async (
  email: string,
  password: string
): Promise<IDataResponse> => {
  const response: IDataResponse = await signInWithEmailAndPassword(
    email,
    password
  );

  if (response) {
    handleResponse(response);
  }

  return response;
};

export const register = async (data: IRegisterData): Promise<IDataResponse> => {
  const response: IDataResponse = await registerUserEmailPassAPI(data);
  if (response) {
    console.log(response.data, "response.data");
    await login(response.email, data.password);
  }
  return response;
};

export const signOut = async (skipMessage?: boolean): Promise<void> => {
  removeCookies();
};

export const updateUserDataFromTokens = async (): Promise<IUserData | null> => {
  const idToken = cookie.get("token");
  if (idToken) {
    const userDataFromAPI: IDataResponse = await getUserDataAPI();

    const userData: IUserData = {
      ...userDataFromAPI.data,
      idToken,
    };
    return userData;
  } else {
    return null;
  }
};
