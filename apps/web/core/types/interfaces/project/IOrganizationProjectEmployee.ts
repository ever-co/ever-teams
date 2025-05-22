import { IBasePerTenantAndOrganizationEntityModel, ID } from '../base-interfaces';
import { IEmployee, IManagerAssignable } from '../organization/employee/IEmployee';
import { IRelationalRole } from '../role/IRole';
import { IOrganizationProject } from './IOrganizationProject';

export interface IOrganizationProjectEmployee
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalRole,
		IManagerAssignable {
	organizationProject: IOrganizationProject;
	organizationProjectId: ID;
	employeeId?: ID; // ID of the employee, if available.
	employee?: IEmployee;
}
