import type { TimerStateEnum } from '~typescript/enums/TimerStateEnum';

export interface ITimerUpdate {
	id: number;
	timer: number;
	runState: TimerStateEnum;
	totalWorked?: number;
}
