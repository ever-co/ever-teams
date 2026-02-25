export interface ITimeLogUpdatePayload {
	timeLogId: string;
	startedAt?: Date;
	stoppedAt?: Date;
	employeeId?: string;
	isBillable?: boolean;
}
