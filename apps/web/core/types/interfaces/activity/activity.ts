import { IBasePerTenantAndOrganizationEntityModel, ID, IUrlMetaData } from '../common/base-interfaces';
import { IRelationalEmployee } from '../organization/employee';
import { IRelationalOrganizationProject } from '../project/organization-project';
import { ITimeSlot } from '../timer/time-slot/time-slot';
import { IOrganizationTeamEmployee } from '../team/organization-team-employee';
import { TTask } from '../../schemas/task/task.schema';

export interface IActivity
	extends IBasePerTenantAndOrganizationEntityModel,
		IRelationalOrganizationProject,
		IRelationalEmployee {
	title: string;
	description?: string;
	timeSlot?: ITimeSlot;
	timeSlotId?: ID;
	task?: TTask;
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
