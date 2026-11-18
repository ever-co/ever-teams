import type { Creator, ITeamTask } from '../../../../services/interfaces/ITask';

/** The person who created the task: Gauzy names them createdByUser, earlier answers creator. */
export function creatorOf(task: ITeamTask | undefined): Creator | undefined {
	return task?.createdByUser ?? task?.creator;
}

export function creatorIdOf(task: ITeamTask | undefined): string | undefined {
	return task?.createdByUserId ?? task?.creatorId ?? creatorOf(task)?.id;
}
