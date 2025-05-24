import { IActivity } from '../activity/IActivity';
import { IBasePerTenantAndOrganizationEntityModel, ID } from '../global/base-interfaces';
import { IEmployee } from '../organization/employee/IEmployee';
import { IOrganizationProject } from '../project/IOrganizationProject';
import { IScreenshot } from '../screenshot/IScreenShot';
import { ITag } from '../tag/ITag';
import { ITimeLog } from '../timelog/ITimeLog';
import { ITimerSlot } from '../to-review/timer/ITimerSlot';
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
export interface IAddManualTimeRequest {
	employeeId: string;
	projectId?: string;
	taskId?: string;
	organizationContactId?: string;
	description?: string;
	reason?: string;
	startedAt: Date;
	stoppedAt: Date;
	editedAt?: Date;
	tags?: string[];
	isBillable?: boolean;
	organizationId?: string;
	organization?: Pick<IOrganization, 'id'>;
	tenantId?: string;
	logType: TimeLogType;
	source: TimerSource.BROWSER;
}
export interface ITimerSlotDataRequest {
	id: string;
	startedAt: Date | string;
	user: {
		imageUrl: string;
		name: string;
	};
	timeSlots: ITimerSlot[];
}
