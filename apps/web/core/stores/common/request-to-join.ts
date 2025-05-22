import { IJoinTeamResponse } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const requestToJoinState = atom<IJoinTeamResponse[]>([]);
