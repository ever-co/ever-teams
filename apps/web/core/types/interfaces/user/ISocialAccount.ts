import { ProviderEnum } from '../../enums/social-accounts';
import { IBasePerTenantEntityModel } from '../global/base-interfaces';
import { ID } from '../to-review/IBaseModel';
import { IRelationalUser } from './IUser';

export interface ISocialAccountBase {
	provider: ProviderEnum;
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
