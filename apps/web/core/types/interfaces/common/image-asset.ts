import { IBasePerTenantAndOrganizationEntityModel } from '../common/base-interfaces';
import { FileStorageProvider } from './file-storage-provider';
import { ID } from './base-interfaces';
import { TImageAsset } from '../../schemas';

export interface IImageAsset extends IBasePerTenantAndOrganizationEntityModel {
	name: string;
	url: string;
	thumb?: string;
	width?: number;
	height?: number;
	size?: number;
	isFeatured?: boolean;
	externalProviderId?: ID;
	storageProvider?: FileStorageProvider;
	fullUrl?: string;
	thumbUrl?: string;
}

export interface IRelationalImageAsset {
	image?: TImageAsset | null;
	imageId?: ID | null;
}

export interface ICreateImageAssets extends Pick<TImageAsset, 'tenantId' | 'organizationId'> {
	file: File;
}
