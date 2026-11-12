export interface TaskCommentItem {
	id: string;
	body: string;
	createdAt: Date;
	parentId: string | null;
	authorName: string;
	authorImageUrl: string | null;
	/** Who wrote it: the employee, or (an author-less comment) the user who posted it. */
	authorEmployeeId: string | null;
	authorUserId: string | null;
	/** When the text last changed, stamped by the platform; `null` when it never did. */
	editedAt: Date | null;
	resolved: boolean;
	resolvedAt: Date | null;
	resolvedByName: string;
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
