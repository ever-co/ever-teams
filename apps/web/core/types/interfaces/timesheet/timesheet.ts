import { ETimesheetStatus } from '../enums/timesheet';
import { IBasePerTenantAndOrganizationEntityModel, ID } from '../common/base-interfaces';
import { IEmployee } from '../organization/employee';
import { ITimeLog } from '../timer/time-log/time-log';
import { IUser } from '../user/user';

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
	status: ETimesheetStatus;
	isEdited?: boolean;
	version?: string;
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

export interface IUpdateTimesheetRequest
	extends Pick<
			Partial<ITimeLog>,
			| 'id'
			| 'reason'
			| 'organizationContactId'
			| 'description'
			| 'organizationTeamId'
			| 'projectId'
			| 'taskId'
			| 'employeeId'
			| 'organizationId'
			| 'tenantId'
			| 'logType'
			| 'source'
		>,
		Pick<ITimeLog, 'startedAt' | 'stoppedAt'> {
	isBillable: boolean;
}
