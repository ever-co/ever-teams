import { ITaskStatusNameEnum, ITaskSizeNameEnum, ITaskLabel, ITaskIssueTypeEnum } from '../../../enums/task';
import { ITaskPriority } from '../ITaskPriority';

export type ITaskStatusStack = {
	status: ITaskStatusNameEnum;
	size: ITaskSizeNameEnum;
	label: ITaskLabel;
	priority: ITaskPriority;
	issueType: ITaskIssueTypeEnum;
	version: string;
	epic: string;
	'status type': any;
	project: string; //TODO: these types are not strings, but rather objects for team and project. To reimplement
	team: string; //TODO: these types are not strings, but rather objects for team and project. To reimplement
	tags: any; //TODO: these types are not strings, but rather array of objects for tags. To reimplement
};
