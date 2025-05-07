import { ProviderEnum } from '@/core/services/server/requests/o-auth';
import { IBasePerTenant } from './IBaseModel';
import { IRelationalUser } from './IUserData';

export interface ISocialAccountBase {
	provider: ProviderEnum;
	providerAccountId: string;
}

export interface ISocialAccount extends ISocialAccountBase, IBasePerTenant, IRelationalUser {}

export type ISocialAccountCreateInput = ISocialAccount;

export type ISocialAccountUpdateInput = Partial<Pick<ISocialAccountCreateInput, 'provider' | 'providerAccountId'>>;

export interface ISocialAccountExistUser extends Partial<ISocialAccountBase> {
	isUserExists: boolean;
}

export interface ISocialAccountSendToken extends Pick<ISocialAccountBase, 'provider'> {
	token: string;
}
