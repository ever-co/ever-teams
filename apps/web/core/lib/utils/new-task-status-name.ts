interface StatusRecord {
	id?: string | null;
	name?: string | null;
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
