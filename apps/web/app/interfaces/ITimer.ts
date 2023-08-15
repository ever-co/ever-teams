export interface ITimer {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	startedAt: string;
	stoppedAt: string;
	logType: string;
	source: TimerSource;
	description: any;
	reason: any;
	isBillable: boolean;
	deletedAt: any;
	isRunning: boolean;
	employeeId: string;
	timesheetId: string;
	projectId: any;
	taskId: string | null;
	organizationContactId: any;
	duration: number;
	isEdited: boolean;
}

export enum TimerSource {
	'MOBILE' = 'MOBILE',
	'BROWSER' = 'BROWSER',
	'DESKTOP' = 'DESKTOP',
	'BROWSER_EXTENSION' = 'BROWSER_EXTENSION',
	'HUBSTAFF' = 'HUBSTAFF',
	'UPWORK' = 'UPWORK',
}

export interface ITimerStatus {
	duration: number;
	lastLog?: ITimer;
	running: boolean;
}

export type ILocalTimerStatus = {
	lastTaskId: string | null;
	runnedDateTime: number;
	running: boolean;
};

export interface ITimerData {
	ms: number;
	s: number;
	m: number;
	h: number;
}

export type ITimerStatusParams = {
	source?: TimerSource;
	tenantId: string;
	organizationId: string;
};

export type ITimerParams = {
	organizationId: string;
	tenantId: string;
	taskId?: string;
	logType: 'TRACKED';
	source: TimerSource;
	tags: any[];
	organizationTeamId?: string;
};

export type ITimerTimeslotParams = {
	organizationId: string;
	employeeId: string;
	logType: 'TRACKED';
	source: TimerSource;
	tenantId: string;
	duration?: number;
	recordedAt?: Date | string;
	startedAt?: Date | string;
};

export type IToggleTimerParams = ITimerStatusParams & {
	logType?: 'TRACKED';
	taskId: string;
};

// ===================== TImesheet ===============

export interface ITasksTimesheet {
	title: string;
	id: string;
	duration: number;
	durationPercentage: number;
}

export interface ITime {
	hours: number;
	minutes: number;
}
