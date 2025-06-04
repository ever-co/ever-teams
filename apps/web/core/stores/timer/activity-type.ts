import { IActivityFilter } from '@/core/types/interfaces/activity/activity';
import { atom } from 'jotai';

export const activityTypeState = atom<IActivityFilter>({
	type: 'DATE',
	member: null
});
