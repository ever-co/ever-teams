import { ITimerLogsDailyReport } from '@app/interfaces/timer/ITimerLogs';
import { atom } from 'recoil';

export const timerLogsDailyReportState = atom<ITimerLogsDailyReport[]>({
	key: 'timerLogsDailyReportState',
	default: []
});
