import { IBasePerTenantAndOrganizationEntityModel, ID, IUrlMetaData } from '../base-interfaces';
import { IRelationalEmployeeEntity } from '../organization/employee/IEmployee';
import { IRelationalOrganizationProject } from '../project/IOrganizationProject';
import { ITask } from '../task/ITask';
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
	metaData?: string | IUrlMetaData;
	date: string;
	time: string;
	duration?: number;
	type?: string;
	source?: string;
	activityTimestamp?: string;
	recordedAt?: Date;
}
