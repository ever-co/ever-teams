import { ETimeLogSource, ETimerStatus } from '../../generics/enums/timer';
import { TTask } from '../../schemas/task/task.schema';
import { ITimeLog } from './time-log/time-log';

export interface ITimerStatus {
	duration?: number;
	running?: boolean;
	lastLog?: ITimeLog;
	lastWorkedTask?: TTask;
	timerStatus?: ETimerStatus;
}

export type ILocalTimerStatus = {
	lastTaskId: string | null;
	runnedDateTime: number;
	running: boolean;
};
export type ITimerStatusReceipt = {
	status: ITimerStatus | null;
	receivedAt: number;
};
export type IGetTimerStatusParams = {
	source?: ETimeLogSource;
	tenantId: string;
	organizationId: string;
	todayStart?: string;
	todayEnd?: string;
};
/** What a timer start records: work, or a break when the organization allows breaks (Gauzy #11940). */
export type TTimerStartLogType = 'TRACKED' | 'BREAK';

export type IUpdateTimerStatusParams = {
	organizationId: string;
	tenantId: string;
	taskId?: string;
	projectId?: string;
	logType: TTimerStartLogType;
	source: ETimeLogSource;
	tags: any[];
	organizationTeamId?: string;
	isBillable?: boolean;
	description?: string;
	planDay?: string;
};
export type IToggleTimerStatusParams = IGetTimerStatusParams & {
	logType?: 'TRACKED';
	taskId: string;
};
