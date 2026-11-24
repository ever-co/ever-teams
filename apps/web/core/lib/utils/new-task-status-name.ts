interface StatusRecord {
	id?: string | null;
	name?: string | null;
}

interface OpenStatusCandidate {
	id?: string | null;
	value?: string | null;
	organizationTeamId?: string | null;
}

const OPEN_VALUE = 'open';

/**
 * The "open" status a task gets when none was picked. A list can hold two of them, the platform's own row and the
 * team's: the team's is taken when there is one, so the task sits in the team's own lane (#5682). Otherwise the
 * first of the list, as before.
 */
export function openStatusOfNewTask<T extends OpenStatusCandidate>(statuses: ReadonlyArray<T>): T | undefined {
	const openStatuses = statuses.filter((status) => status.value === OPEN_VALUE);
	const ofTheTeam = openStatuses.find((status) => Boolean(status.organizationTeamId));
	if (ofTheTeam) {
		return ofTheTeam;
	}
	return openStatuses[0];
}

/**
 * The status name a new task is saved with. A task carries its status twice, as a name and as the id of a status
 * record, and each screen reads one or the other: when no name was picked, the name is the one of the record the task
 * is created with, so both agree (#5682). Without such a record it stays the first status of the list, as before.
 */
export function newTaskStatusNameOf(
	pickedName: string | null | undefined,
	taskStatusId: string | null | undefined,
	statuses: ReadonlyArray<StatusRecord>
): string | null | undefined {
	const hasPickedName = pickedName !== undefined && pickedName !== null;
	if (hasPickedName) {
		return pickedName;
	}
	const record = statuses.find((status) => status.id === taskStatusId);
	if (record?.name) {
		return record.name;
	}
	return statuses[0]?.name;
}
