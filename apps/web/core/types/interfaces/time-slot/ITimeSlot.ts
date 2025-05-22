import { IActivity } from '../activity/IActivity';
import { IBasePerTenantAndOrganizationEntityModel, ID } from '../base-interfaces';
import { IEmployee } from '../organization/employee/IEmployee';
import { IOrganizationProject } from '../project/IOrganizationProject';
import { IScreenshot } from '../screenshot/IScreenShot';
import { ITag } from '../tag/ITag';
import { ITimeLog } from '../timelog/ITimeLog';
import { ITimeSlotMinute } from './ITimeSlotMinutes';

export interface ITimeSlot extends IBasePerTenantAndOrganizationEntityModel {
	[x: string]: any;
	employeeId: ID;
	employee?: IEmployee;
	activities?: IActivity[];
	screenshots?: IScreenshot[];
	timeLogs?: ITimeLog[];
	timeSlotMinutes?: ITimeSlotMinute[];
	project?: IOrganizationProject;
	projectId?: ID;
	duration?: number;
	keyboard?: number;
	mouse?: number;
	overall?: number;
	startedAt: Date;
	stoppedAt?: Date;
	percentage?: number;
	keyboardPercentage?: number;
	mousePercentage?: number;
	tags?: ITag[];
	isAllowDelete?: boolean;
}
