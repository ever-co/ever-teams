import { IBaseEntityModel } from '../base-interfaces';
import { IRelationalImageAsset } from '../image-asset/IImageAsset';
import { IOrganization } from '../organization/IOrganization';
import { IRolePermission } from '../role/permission';

export interface ITenant extends IBaseEntityModel, IRelationalImageAsset {
	name?: string;
	logo?: string;
	standardWorkHoursPerDay?: number;
	organizations?: IOrganization[];
	rolePermissions?: IRolePermission[];
	// featureOrganizations?: IFeatureOrganization[];
	// importRecords?: IImportRecord[];
}
