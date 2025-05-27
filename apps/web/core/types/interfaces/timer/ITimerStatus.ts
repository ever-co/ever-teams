import { ETimeLogSource, ETimerStatus } from '../enums/timer';
import { ITask } from '../task/ITask';
import { ITimeLog } from './time-log/ITimeLog';

export interface ITimerStatus {
	duration?: number;
	running?: boolean;
	lastLog?: ITimeLog;
	lastWorkedTask?: ITask;
	timerStatus?: ETimerStatus;
}

export type ILocalTimerStatus = {
	lastTaskId: string | null;
	runnedDateTime: number;
	running: boolean;
};
export type IGetTimerStatusParams = {
	source?: ETimeLogSource;
	tenantId: string;
	organizationId: string;
};
export type IUpdateTimerStatusParams = {
	organizationId: string;
	tenantId: string;
	taskId?: string;
	logType: 'TRACKED';
	source: ETimeLogSource;
	tags: any[];
	organizationTeamId?: string;
};
export type IToggleTimerStatusParams = IGetTimerStatusParams & {
	logType?: 'TRACKED';
	taskId: string;
};
