import { TimeLogSourceEnum, TimeLogType } from '../../enums/timesheet';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../base-interfaces';
import { IEmployee } from '../IEmployee';
import { IRelationalOrganizationProject } from '../project/IOrganizationProject';
import { ITask } from '../tasks/ITask';
import { IRelationalOrganizationTeam } from '../team/IOrganizationTeam';
import { ITimeSlot } from '../time-slot/ITimeSlot';
import { ITimesheet } from '../timesheet/ITimesheet';

export interface ITimeLog
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationProject,
		IRelationalOrganizationTeam,
		ITaggable {
	employee: IEmployee;
	employeeId: ID;
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
}
