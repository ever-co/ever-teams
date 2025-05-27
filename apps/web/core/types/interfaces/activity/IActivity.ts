import { IBasePerTenantAndOrganizationEntityModel, ID, IUrlMetaData } from '../global/base-interfaces';
import { IRelationalEmployee } from '../organization/employee/IEmployee';
import { IRelationalOrganizationProject } from '../project/IOrganizationProject';
import { ITask } from '../task/ITask';
import { ITimeSlot } from '../time-slot/ITimeSlot';
import { IOrganizationTeamEmployee } from '../team/IOrganizationTeamEmployee';

export interface IActivity
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationProject,
		IRelationalEmployee {
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
export interface IActivityFilter {
	type: 'DATE' | 'TICKET';
	member: IOrganizationTeamEmployee | null;
	taskId?: string;
	dateStart?: Date;
	dateStop?: Date;
}
