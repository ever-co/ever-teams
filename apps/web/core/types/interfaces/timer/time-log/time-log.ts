import { IRelationalEmployee } from '../../organization/employee';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../../common/base-interfaces';
import { IRelationalOrganizationProject } from '../../project/organization-project';
import { IRelationalOrganizationTeam } from '../../team/organization-team';
import { ITimeSlot } from '../time-slot/time-slot';
import { ITimesheet } from '../../timesheet/timesheet';
import { ETimeLogSource, ETimeLogType } from '../../../generics/enums/timer';
import { TTask } from '@/core/types/schemas/task/task.schema';

export interface ITimeLog
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationProject,
		IRelationalOrganizationTeam,
		IRelationalEmployee,
		ITaggable {
	timesheet?: ITimesheet;
	timesheetId?: ID;
	task?: TTask;
	taskId?: ID;
	timeSlots?: ITimeSlot[];
	projectId?: ID;
	// organizationContact?: IOrganizationContact;
	organizationContactId?: ID;
	source?: ETimeLogSource;
	startedAt?: Date;
	stoppedAt?: Date;
	editedAt?: Date;
	logType?: ETimeLogType;
	description?: string;
	reason?: string;
	duration: number;
	isBillable?: boolean;
	isRunning?: boolean;
	isEdited?: boolean;
	version: string;
}
