export interface ITimeLogUpdatePayload {
	timeLogId: string;
	startedAt?: Date;
	stoppedAt?: Date;
	employeeId?: string;
	projectId?: string;
	taskId?: string;
	description?: string;
	isBillable?: boolean;
	/**
	 * The `updatedAt` the entry was read at, as the API states it (#5382): Ever Gauzy saves the update only while the
	 * entry still holds it, and answers 409 `TIME_LOG_CHANGED` otherwise, having written nothing. An older Ever Gauzy
	 * leaves it out (the route keeps only the members it declares) and saves as before.
	 */
	expectedUpdatedAt?: string;
}
