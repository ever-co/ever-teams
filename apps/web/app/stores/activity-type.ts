import { IActivityFilter } from '@app/interfaces/IActivityFilter';
import { atom } from 'recoil';

export const activityTypeState = atom<IActivityFilter>({
	key: 'activityTypeState',
	default: {
		type: 'DATE',
		member: null
	}
});
