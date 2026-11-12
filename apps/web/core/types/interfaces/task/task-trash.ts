import { ID } from '../common/base-interfaces';

/** A person as the trash shows them (who deleted a task, its assignees). */
export interface ITrashedTaskPerson {
	id?: ID;
	firstName?: string | null;
	lastName?: string | null;
	name?: string | null;
	imageUrl?: string | null;
}

/**
 * A task in the trash, as `GET /tasks/trash` answers it: the task's own fields plus when and by whom it was deleted.
 * Kept apart from the task schema on purpose: a trashed task is read, restored or deleted, never edited.
 */
export interface ITrashedTask {
	id: ID;
	title: string;
	number?: number | null;
	prefix?: string | null;
	taskNumber?: string | null;
	issueType?: string | null;
	status?: string | null;
	projectId?: ID | null;
	project?: { id: ID; name?: string | null } | null;
	teams?: Array<{ id: ID; name?: string | null }>;
	members?: Array<{ id: ID; fullName?: string | null; user?: ITrashedTaskPerson | null }>;
	deletedAt: string;
	deletedByUserId?: ID | null;
	deletedByUser?: ITrashedTaskPerson | null;
}

/** Which trash to list: the active team's, or a project's (with the team for a manager's read). */
export interface ITaskTrashQuery {
	organizationTeamId?: ID | null;
	projectId?: ID | null;
	search?: string;
	skip?: number;
	take?: number;
}
