import { IRelationalEmployee } from '../organization/employee/IEmployee';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../global/base-interfaces';
import { IRelationalOrganizationProject } from '../project/IOrganizationProject';
import { ITask } from '../task/ITask';
import { IRelationalOrganizationTeam } from '../team/IOrganizationTeam';
import { ITimeSlot } from '../time-slot/ITimeSlot';
import { ITimesheet } from '../timesheet/ITimesheet';
import { TimeLogSourceEnum, TimeLogType } from '../../enums/timer';

export interface ITimeLog
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationProject,
		IRelationalOrganizationTeam,
		IRelationalEmployee,
		ITaggable {
	timesheet?: ITimesheet;
	timesheetId?: ID;
	task?: ITask;
	taskId?: ID;
	timeSlots?: ITimeSlot[];
	projectId?: ID;
	// organizationContact?: IOrganizationContact;
	organizationContactId?: ID;
	source?: TimeLogSourceEnum;
	startedAt?: Date;
	stoppedAt?: Date;
	editedAt?: Date;
	logType?: TimeLogType;
	description?: string;
	reason?: string;
	duration: number;
	isBillable?: boolean;
	isRunning?: boolean;
	isEdited?: boolean;
	version: string;
}
