import { ETimeLogType, ETimeLogSource } from '../../enums/timer';
import { IActivity } from '../../activity/activity';
import { IBasePerTenantAndOrganizationEntityModel, ID } from '../../global/base-interfaces';
import { IEmployee } from '../../organization/employee';
import { IOrganization } from '../../organization/organization';
import { IOrganizationProject } from '../../project/organization-project';
import { IScreenshot } from '../screenshot/screenshot';
import { ITag } from '../../tag/tag';
import { ITimeLog } from '../time-log/time-log';
import { ITimeSlotMinute } from './time-slot-minutes';

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
	logType: ETimeLogType;
	source: ETimeLogSource.BROWSER;
}
export interface ITimerSlotDataRequest {
	id: string;
	startedAt: Date | string;
	user: {
		imageUrl: string;
		name: string;
	};
	timeSlots: ITimeSlot[];
}
