import { IJoinTeamResponse } from '@/core/types/interfaces/team/request-to-join';
import { atom } from 'jotai';

export const requestToJoinState = atom<IJoinTeamResponse[]>([]);
