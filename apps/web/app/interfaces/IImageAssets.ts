export interface IImageAssets {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	name: string;
	url: string;
	thumb?: string | null;
	width?: number;
	height?: number;
	size?: number;
	isFeatured: boolean;
	deletedAt?: string | null;
	fullUrl: string;
	thumbUrl?: string | null;
}

export interface ICreateImageAssets
	extends Pick<IImageAssets, 'tenantId' | 'organizationId'> {
	file: File;
}
