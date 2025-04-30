import { ITaskIssue } from './ITask';

export interface IIssueTypesCreate {
	name: ITaskIssue;
	description?: string;
	icon?: string;
	color?: string;
	projectId?: string;
	organizationId?: string;
	tenantId?: string | undefined | null;
	organizationTeamId?: string | undefined | null;
	isDefault?: boolean;
}

export interface IIssueTypesItemList extends IIssueTypesCreate {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	value?: string;
	fullIconUrl?: string;
	is_system?: boolean;
	isSystem?: boolean;
	isDefault: boolean;
}
