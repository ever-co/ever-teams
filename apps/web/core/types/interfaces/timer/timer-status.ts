import { ETimeLogSource, ETimerStatus } from '../../generics/enums/timer';
import { ITask } from '../task/task';
import { ITimeLog } from './time-log/time-log';

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
