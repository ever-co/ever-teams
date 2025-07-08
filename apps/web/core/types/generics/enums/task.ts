export enum ETaskListType {
	GRID = 'GRID',
	SPRINT = 'SPRINT'
}

export enum ETaskPriority {
	URGENT = 'urgent',
	HIGH = 'high',
	MEDIUM = 'medium',
	LOW = 'low'
}

export enum ETaskSize {
	X_LARGE = 'x-large',
	LARGE = 'large',
	MEDIUM = 'medium',
	SMALL = 'small',
	TINY = 'tiny'
}

export enum ETaskType {
	EPIC = 'Epic',
	STORY = 'Story',
	TASK = 'Task',
	BUG = 'Bug',
	MEMO = 'Memo'
}

export enum ERelatedIssuesRelation {
	IS_BLOCKED_BY = 1,
	BLOCKS = 2,
	IS_CLONED_BY = 3,
	CLONES = 4,
	IS_DUPLICATED_BY = 5,
	DUPLICATES = 6,
	RELATES_TO = 7
}
export enum ETaskStatusName {
	BLOCKED = 'blocked',
	READY = 'ready',
	BACKLOG = 'backlog',
	TODO = 'todo',
	IN_PROGRESS = 'in-progress',
	COMPLETED = 'completed',
	CLOSED = 'closed',
	IN_REVIEW = 'in review',
	OPEN = 'open',
	CUSTOM = 'custom',
	READY_FOR_REVIEW = 'ready-for-review',
	IN_REVIEW_STATUS = 'in-review',
	DONE = 'done',
	CANCELLED = 'cancelled'
}
export enum ETaskSizeName {
	X_LARGE = 'X-Large',
	LARGE = 'Large',
	MEDIUM = 'Medium',
	SMALL = 'Small',
	TINY = 'Tiny'
}

export enum EIssueType {
	BUG = 'Bug',
	TASK = 'Task',
	STORY = 'Story',
	EPIC = 'Epic'
}
