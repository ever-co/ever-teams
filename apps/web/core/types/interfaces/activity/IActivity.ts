import { IBasePerTenantAndOrganizationEntityModel, ID, IURLMetaData } from '../base-interfaces';
import { IRelationalEmployeeEntity } from '../organization/employee/IEmployee';
import { IRelationalOrganizationProject } from '../project/IOrganizationProject';
import { ITask } from '../tasks/ITask';
import { ITimeSlot } from '../time-slot/ITimeSlot';

export interface IActivity
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationProject,
		IRelationalEmployeeEntity {
	title: string;
	description?: string;
	timeSlot?: ITimeSlot;
	timeSlotId?: ID;
	task?: ITask;
	taskId?: ID;
	metaData?: string | IURLMetaData;
	date: string;
	time: string;
	duration?: number;
	type?: string;
	source?: string;
	activityTimestamp?: string;
	recordedAt?: Date;
}
