import { ERelatedIssuesRelation } from '../../generics/enums/task';
import { TTask } from '../../schemas/task/task.schema';
import { IBasePerTenantAndOrganizationEntityModel, ID } from '../common/base-interfaces';

export interface ITaskLinkedIssue extends IBasePerTenantAndOrganizationEntityModel {
	action: ERelatedIssuesRelation;
	taskFrom?: TTask;
	taskFromId: ID;
	taskTo?: TTask;
	taskToId: ID;
}
