import { ERelatedIssuesRelation } from '../enums/task';
import { IBasePerTenantAndOrganizationEntityModel, ID } from '../global/base-interfaces';
import { ITask } from './task';

export interface ITaskLinkedIssue extends IBasePerTenantAndOrganizationEntityModel {
	action: ERelatedIssuesRelation;
	taskFrom?: ITask;
	taskFromId: ID;
	taskTo?: ITask;
	taskToId: ID;
}
