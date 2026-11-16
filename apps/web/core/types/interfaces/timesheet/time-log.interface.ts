export interface ITimeLogUpdatePayload {
	timeLogId: string;
	startedAt?: Date;
	stoppedAt?: Date;
	employeeId?: string;
	projectId?: string;
	taskId?: string;
	description?: string;
	isBillable?: boolean;
	/** The labels the entry is filed under from now on (Gauzy #12029); left out, it keeps its own. */
	tags?: string[];
}
