export interface ITeamProps {
  email: string;
  name: string;
  team: string;
}

export interface IUser {
  lastName: string;
  email: string;
  imageUrl: string;
  name: string;
  tenantId: string | null;
  thirdPartyId: string | null;
  firstName: string | null;
  username: string | null;
  phoneNumber: string | null;
  preferredLanguage: string;
  preferredComponentLayout: string;
  isActive: boolean;
  roleId: string | null;
  id: string;
  employee: any;
  role: Role;
  tenant: Tenant;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  name: string;
  isSystem: boolean;
}

interface Tenant {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  logo: string;
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
