import { IBasePerTenantAndOrganizationEntityModel, ID } from '../global/base-interfaces';
import { IManagerAssignable, IRelationalEmployee } from '../organization/employee';
import { IRelationalRole } from '../role/role';
import { ITask, ITasksStatistics } from '../task/task';
import { ITimerStatus } from '../timer/timer-status';
import { IRelationalOrganizationTeam } from './organization-team';

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
		IRelationalEmployee,
		IRelationalRole,
		ITimerStatus {
	activeTaskId?: ID; // Active Task of the team member
	activeTask?: ITask;
	isManager?: boolean;
	isActive?: boolean;
	totalWorkedTasks?: ITasksStatistics[];
	totalTodayTasks?: ITasksStatistics[];
}

export interface IOrganizationTeamEmployeeCreate {
	name?: string;
	organizationId?: string;
	organizationTeamId?: string;
	tenantId?: string;
	employeeId?: string;
	roleId?: string;
	isTrackingEnabled?: boolean;
	activeTaskId?: string;
	order?: number;
}

export interface IOrganizationTeamEmployeeUpdate extends IOrganizationTeamEmployeeCreate {
	id: string;
}

// export interface OT_Member {
// 	id: string;
// 	order?: number;
// 	createdAt: string;
// 	updatedAt: string;
// 	tenantId: any;
// 	organizationId: any;
// 	organizationTeamId: string;
// 	employeeId: string;
// 	roleId?: string;
// 	role?: OT_Role;
// 	employee: IEmployee;
// 	lastWorkedTask?: ITask;
// 	running?: boolean;
// 	duration?: number;
// 	isTrackingEnabled?: boolean;
// 	totalTodayTasks: ITasksStatistics[];
// 	totalWorkedTasks: ITasksStatistics[];
// 	timerStatus?: ITimerStatusEnum;
// 	activeTaskId?: string;
// 	isManager: boolean;
// }
