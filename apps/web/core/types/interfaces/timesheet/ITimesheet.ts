import { TimesheetStatus } from '../../enums/timesheet';
import { IBasePerTenantAndOrganizationEntityModel, ID } from '../global/base-interfaces';
import { IEmployee } from '../organization/employee/IEmployee';
import { ITimeLog } from '../time-log/ITimeLog';
import { IUser } from '../user/IUser';

export interface ITimesheet extends IBasePerTenantAndOrganizationEntityModel {
	employee: IEmployee;
	employeeId?: ID;
	approvedBy?: IUser;
	approvedById?: ID;
	timeLogs?: ITimeLog[];
	duration?: number;
	keyboard?: number;
	mouse?: number;
	overall?: number;
	startedAt?: Date;
	stoppedAt?: Date;
	approvedAt?: Date;
	submittedAt?: Date;
	lockedAt?: Date;
	editedAt?: Date;
	isBilled?: boolean;
	status: TimesheetStatus;
	isEdited?: boolean;
}
export interface IUpdateTimesheetStatus {
	ids: ID[] | ID;
	organizationId?: ID;
	status: ID;
	tenantId?: ID;
}

export interface ITimesheetCountsStatistics {
	employeesCount: number;
	projectsCount: number;
	weekActivities: number;
	weekDuration: number;
	todayActivities: number;
	todayDuration: number;
}
