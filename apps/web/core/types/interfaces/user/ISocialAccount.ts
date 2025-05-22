import { ProviderEnum } from '../../enums/social-accounts';
import { IBasePerTenantEntityModel } from '../base-interfaces';
import { ID } from '../IBaseModel';
import { IRelationalUser } from './IUser';

export interface ISocialAccountBase {
	provider: ProviderEnum;
	providerAccountId: ID;
}

export interface ISocialAccount extends ISocialAccountBase, IBasePerTenantEntityModel, IRelationalUser {}
