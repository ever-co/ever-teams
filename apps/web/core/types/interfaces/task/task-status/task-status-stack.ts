import { ETaskStatusName, ETaskSizeName, EIssueType, ETaskPriority } from '../../enums/task';

export type ITaskStatusStack = {
	status: ETaskStatusName;
	size: ETaskSizeName;
	label: string;
	priority: ETaskPriority;
	issueType: EIssueType;
	version: string;
	epic: string;
	'status type': any;
	project: string; //TODO: these types are not strings, but rather objects for team and project. To reimplement
	team: string; //TODO: these types are not strings, but rather objects for team and project. To reimplement
	tags: any; //TODO: these types are not strings, but rather array of objects for tags. To reimplement
};
