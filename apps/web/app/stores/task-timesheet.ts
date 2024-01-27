import { atom } from 'recoil';

export const taskTimesheetState = atom<any[]>({
	key: 'taskTimesheetState',
	default: []
});
