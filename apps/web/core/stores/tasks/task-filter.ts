import { TeamMemberFilterType } from '@/core/lib/utils/team-members.utils';
import { atom } from 'jotai';

export const taskBlockFilterState = atom<TeamMemberFilterType>('all');
