import { TaskRelatedIssuesRelationEnum } from '../../enums/task';
import { IBasePerTenantAndOrganizationEntityModel, ID } from '../base-interfaces';
import { ITask } from './ITask';

export interface ITaskLinkedIssue extends IBasePerTenantAndOrganizationEntityModel {
	action: TaskRelatedIssuesRelationEnum;
	taskFrom?: ITask;
	taskFromId: ID;
	taskTo?: ITask;
	taskToId: ID;
}
