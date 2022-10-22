export interface ITeamProps {
  email: string;
  name: string;
  team: string;
}

export interface IUser {
  lastName: string;
  email: string;
  imageUrl: string;
  tenantId: string | null;
  thirdPartyId: string | null;
  firstName: string | null;
  username: string | null;
  preferredLanguage: string;
  preferredComponentLayout: string;
  isActive: boolean;
  roleId: string | null;
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface IRegisterData {
  user: Required<Pick<IUser, "email" | "firstName" | "lastName">>;
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
