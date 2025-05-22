import { TimesheetStatus } from '../../enums/timesheet';
import { IBasePerTenantAndOrganizationEntityModel, ID } from '../base-interfaces';
import { IEmployee } from '../organization/employee/IEmployee';
import { ITimeLog } from '../timelog/ITimeLog';
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
