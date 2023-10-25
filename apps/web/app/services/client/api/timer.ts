import { ITimerStatus, IToggleTimerParams, TimerSource } from '@app/interfaces/ITimer';
import api from '../axios';

export function getTimerStatusAPI() {
	return api.get<ITimerStatus>('/timer/status');
}

export function toggleTimerAPI(body: Pick<IToggleTimerParams, 'taskId'>) {
	return api.post<ITimerStatus>('/timer/toggle', body);
}

export function startTimerAPI() {
	return api.post<ITimerStatus>('/timer/start');
}

export function stopTimerAPI(source: TimerSource) {
	return api.post<ITimerStatus>('/timer/stop', {
		source
	});
}

export function syncTimerAPI(source: TimerSource) {
	return api.post<ITimerStatus>('/timer/sync', {
		source
	});
}
