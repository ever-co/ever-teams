export interface ITimeLogUpdatePayload {
	timeLogId: string;
	startedAt?: Date;
	stoppedAt?: Date;
	employeeId?: string;
	projectId?: string;
	description?: string;
	isBillable?: boolean;
}
