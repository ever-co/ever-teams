export interface ITaskStatusItem {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	name?: string;
	value?: string;
	description?: string;
	icon?: string;
	color?: string;
	is_system?: boolean;
	isSystem?: boolean;
	projectId?: string;
	fullIconUrl?: string;
}

export interface ITaskStatusCreate {
	template?: TaskStatusEnum;
	name: string;
	description?: string;
	icon?: string;
	color?: string;
	projectId?: string;
	organizationId?: string;
	tenantId?: string | undefined | null;
	organizationTeamId?: string | undefined | null;
}

export enum TaskStatusEnum {
	BACKLOG = 'backlog',
	OPEN = 'open',
	IN_PROGRESS = 'in-progress',
	READY_FOR_REVIEW = 'ready-for-review',
	IN_REVIEW = 'in-review',
	BLOCKED = 'blocked',
	DONE = 'done',
	COMPLETED = 'completed',
	CUSTOM = 'custom'
}
