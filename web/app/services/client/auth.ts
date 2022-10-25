import { removeCookies } from "../../helpers/getCookies";
import { handleResponse, storeUserTokens } from "../../helpers/_helper";
import { IDataResponse } from "../../interfaces/IDataResponse";
import { IUser, IUserData } from "../../interfaces/IUserData";

import cookie from "js-cookie";
import {
  getUserDataAPI,
  registerUserTeamAPI,
  signInWithEmailAndPassword,
} from "./api/auth";
import {
  IRegisterDataAPI,
  IRegisterDataRequest,
} from "@app/interfaces/IAuthentication";

export const login = async (
  email: string,
  password: string
): Promise<IDataResponse> => {
  const response: IDataResponse = await signInWithEmailAndPassword(
    email,
    password
  );
};

export const register = async (data: IRegisterDataAPI) => {
  const response = await registerUserTeamAPI(data);
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
