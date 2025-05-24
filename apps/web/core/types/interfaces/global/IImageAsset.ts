import { IBasePerTenantAndOrganizationEntityModel } from '../global/base-interfaces';
import { FileStorageProvider } from '../file-storage/IFileStorageProvider';
import { ID } from '../to-review/IBaseModel';

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
	image?: IImageAsset | null;
	imageId?: ID | null;
}

export interface ICreateImageAssets extends Pick<IImageAsset, 'tenantId' | 'organizationId'> {
	file: File;
}
