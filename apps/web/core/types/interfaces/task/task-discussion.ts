export interface TaskCommentItem {
	id: string;
	body: string;
	createdAt: Date;
	parentId: string | null;
	authorName: string;
	authorImageUrl: string | null;
}

export interface TaskActivityChange {
	field: string;
	from: string | null;
	to: string | null;
}

export interface TaskActivityItem {
	id: string;
	/** Gauzy's `ActionTypeEnum` value as returned (`Created`, `Updated`, `Deleted`), never translated. */
	action: string;
	createdAt: Date;
	actorName: string;
	actorImageUrl: string | null;
	changes: TaskActivityChange[];
}
