import { EProvider } from '../enums/social-accounts';
import { IBasePerTenantEntityModel } from '../common/base-interfaces';
import { ID } from '../common/base-interfaces';
import { IRelationalUser } from './user';

export interface ISocialAccountBase {
	provider: EProvider;
	providerAccountId: ID;
}

export interface ISocialAccount extends ISocialAccountBase, IBasePerTenantEntityModel, IRelationalUser {}

export type ISocialAccountCreateInput = ISocialAccount;

export type ISocialAccountUpdateInput = Partial<Pick<ISocialAccountCreateInput, 'provider' | 'providerAccountId'>>;

export interface ISocialAccountExistUser extends Partial<ISocialAccountBase> {
	isUserExists: boolean;
}

export interface ISocialAccountSendToken extends Pick<ISocialAccountBase, 'provider'> {
	token: string;
}
