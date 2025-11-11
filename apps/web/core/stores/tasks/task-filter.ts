import { TeamMemberFilterType } from '@/core/lib/utils/team-members.utils';
import { atom } from 'jotai';

export const taskBlockFilterState = atom<TeamMemberFilterType>('all');

// Search query state for Blocks view member filtering
export const blockViewSearchQueryState = atom<string>('');
