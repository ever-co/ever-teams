import { IUser } from "./IUserData";

export interface ILoginReponse {
  user: IUser;
  token: string;
  refresh_token: string;
}
