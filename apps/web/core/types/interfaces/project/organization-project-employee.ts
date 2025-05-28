import { IBasePerTenantAndOrganizationEntityModel, ID } from '../global/base-interfaces';
import { IEmployee, IManagerAssignable } from '../organization/employee';
import { IRelationalRole } from '../role/role';
import { IOrganizationProject } from './organization-project';

export interface IOrganizationProjectEmployee
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalRole,
		IManagerAssignable {
	organizationProject: IOrganizationProject;
	organizationProjectId: ID;
	employeeId?: ID; // ID of the employee, if available.
	employee?: IEmployee;
}
