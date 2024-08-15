export interface ITaskStatusItemList extends TaskStatusWorkFlow {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	name?: string;
	value?: string;
	description?: string;
	icon?: string;
	fullIconUrl?: string;
	color?: string;
	is_system?: boolean;
	isSystem?: boolean;
	projectId?: string;
	isCollapsed?: boolean;
	organizationTeamId?: string | undefined | null;
	order?: number;
	template?: TaskStatusEnum;
}

export interface ITaskStatusCreate
	extends Partial<Omit<ITaskStatusItemList, 'isSystem'>>,
		Partial<Omit<ITaskStatusItemList, 'is_system'>> {}

/**
 * Default task statuses
 */
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

export interface TaskStatusWorkFlow {
	isTodo?: boolean;
	isInProgress?: boolean;
	isDone?: boolean;
}
