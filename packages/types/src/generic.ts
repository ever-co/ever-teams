import { EFileAssetType, UserPermissionLevel } from './enums';

export type TUserPermission = UserPermissionLevel.ADMIN | UserPermissionLevel.MEMBER | UserPermissionLevel.GUEST;

// --------------------------------------------------
// 📦 FILES - File Metadata and Upload Types
// --------------------------------------------------

export type TFileMetaDataLite = {
	name: string; // File name
	size: number; // Size in bytes
	type: string; // MIME type
};

export type TFileEntityInfo = {
	entity_identifier: string; // ID of the associated entity
	entity_type: EFileAssetType; // The type of asset associated
};

export type TFileMetaData = TFileMetaDataLite & TFileEntityInfo;

export type TFileSignedURLResponse = {
	asset_id: string;
	asset_url: string;
	upload_data: {
		url: string;
		fields: {
			'Content-Type': string;
			key: string;
			'x-amz-algorithm': string;
			'x-amz-credential': string;
			'x-amz-date': string;
			policy: string;
			'x-amz-signature': string;
		};
	};
};
