import { IActivityFilter } from '@/core/types/interfaces/IActivityFilter';
import { atom } from 'jotai';

export const activityTypeState = atom<IActivityFilter>({
	type: 'DATE',
	member: null
});
