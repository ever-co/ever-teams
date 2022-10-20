export interface ITeamProps {
  email: string;
  name: string;
  team: string;
}
export interface IUser {
  id?: string;
  email: string;
  fullName: string;
}

export interface IRegisterData {
  user: IUser;
  password: string;
  confirmPassword: string;
}

export interface ITokens {
  token: string;
}

export interface IUserData {
  id?: string;
  token: string;
  email: string;
  firstName: string;
  lastName?: string;
  imageUrl?: string;
  username?: string;
  isActive?: boolean;
}
