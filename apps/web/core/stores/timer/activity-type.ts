import { IActivityFilter } from '../types/interfaces/activity/IActivity';
import { atom } from 'jotai';

export const activityTypeState = atom<IActivityFilter>({
	type: 'DATE',
	member: null
});
