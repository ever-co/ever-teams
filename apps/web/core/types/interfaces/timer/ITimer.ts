import { ITask } from '../tasks/ITask';
import { ITimeLog } from '../timelog/ITimeLog';

export interface ITimerStatus {
	duration?: number;
	running?: boolean;
	lastLog?: ITimeLog;
	lastWorkedTask?: ITask;
	timerStatus?: 'running' | 'pause' | 'idle';
}
