import { IBaseEntity } from '../common/base-interfaces';
import { IRelationalImageAsset } from '../common/image-asset';
import { IOrganization } from '../organization/organization';
import { IRolePermission } from '../role/role-permission';

export interface ITenant extends IBaseEntity, IRelationalImageAsset {
	name?: string;
	logo?: string;
	standardWorkHoursPerDay?: number;
	organizations?: IOrganization[];
	rolePermissions?: IRolePermission[];
	// featureOrganizations?: IFeatureOrganization[];
	// importRecords?: IImportRecord[];
}
