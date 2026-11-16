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
	'TEAMS' = 'TEAMS'
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

export type ITimerStatusParams = {
	source?: TimerSource;
	tenantId: string;
	organizationId: string;
};

export type ITimerParams = {
	organizationId: string;
	tenantId: string;
	taskId: string;
	logType: 'TRACKED';
	source: TimerSource;
	tags: any[];
	organizationTeamId?: string;
};

export type IToggleTimerParams = ITimerStatusParams & {
	logType?: 'TRACKED';
	taskId: string;
};

/** The body of `PUT /timesheet/timer/started-at`: the new start of the running timer, and why it changes. */
export type ITimerStartMoveParams = {
	/** The new start, as an ISO date. */
	startedAt: string;
	reason?: string;
};

/** The body of `POST /timesheet/timer/discard`: the running run the discard is for, in its organization. */
export type ITimerDiscardParams = {
	timeLogId: string;
	tenantId: string;
	organizationId: string;
};

/** The body of a refusal from the API: its `code` names the rule that refused. */
export type IApiRefusal = {
	statusCode?: number;
	message?: string | string[];
	code?: string;
};

// ===================== TImesheet ===============

export interface ITasksTimesheet {
	title: string;
	id: string;
	duration: number;
	durationPercentage: number;
}
