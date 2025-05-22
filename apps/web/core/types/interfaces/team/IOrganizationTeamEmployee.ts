import { IBasePerTenantAndOrganizationEntityModel, ID } from '../base-interfaces';
import { IRelationnalEmployee } from '../to-review/IEmployee';
import { IManagerAssignable } from '../organization/employee/IEmployee';
import { IRelationalRole } from '../role/IRole';
import { ITask } from '../task/ITask';
import { ITimerStatus } from '../timer/ITimer';
import { IRelationalOrganizationTeam } from './IOrganizationTeam';

// Base interface with common properties
export interface IBaseOrganizationTeamEmployee
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationTeam,
		IManagerAssignable {
	order?: number; // Organization Team Employee Order
	isTrackingEnabled?: boolean; // Enabled/Disabled Time Tracking of the team member
}

// Interface for Organization Team Employee
export interface IOrganizationTeamEmployee
	extends IBaseOrganizationTeamEmployee,
		IRelationnalEmployee,
		IRelationalRole,
		ITimerStatus {
	activeTaskId?: ID; // Active Task of the team member
	activeTask?: ITask;
}
