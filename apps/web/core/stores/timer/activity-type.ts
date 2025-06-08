import { TActivityFilter } from '@/core/types/schemas';
import { atom } from 'jotai';

export const activityTypeState = atom<TActivityFilter>({
	type: 'DATE',
	member: null
});
