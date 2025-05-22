export enum TaskListTypeEnum {
	GRID = 'GRID',
	SPRINT = 'SPRINT'
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
	CANCELLED = 'cancelled',
	CUSTOM = 'custom'
}

export enum TaskPriorityEnum {
	URGENT = 'urgent',
	HIGH = 'high',
	MEDIUM = 'medium',
	LOW = 'low'
}

export enum TaskSizeEnum {
	X_LARGE = 'x-large',
	LARGE = 'large',
	MEDIUM = 'medium',
	SMALL = 'small',
	TINY = 'tiny'
}

export enum TaskTypeEnum {
	EPIC = 'epic',
	STORY = 'story',
	TASK = 'task',
	BUG = 'bug',
	MEMO = 'memo'
}
