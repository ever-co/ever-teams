import { ITaskTimesheet } from '@app/interfaces';
import { atom } from 'recoil';

export const taskTimesheetState = atom<ITaskTimesheet[]>({
	key: 'taskTimesheetState',
	default: []
});
