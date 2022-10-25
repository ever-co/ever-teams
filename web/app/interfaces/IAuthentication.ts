import { ITeamProps, IUser } from "./IUserData";

export interface ILoginReponse {
  user: IUser;
  token: string;
  refresh_token: string;
}

export interface IRegisterDataRequest {
  user: Required<Pick<IUser, "email" | "firstName" | "lastName">>;
  password: string;
  confirmPassword: string;
}

export interface IRegisterDataAPI extends ITeamProps {}
