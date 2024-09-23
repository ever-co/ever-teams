import { IActivityFilter } from '@app/interfaces/IActivityFilter';
import { atom } from 'jotai';

export const activityTypeState = atom<IActivityFilter>({
  type: 'DATE',
  member: null
});
