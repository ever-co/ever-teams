import { IJoinTeamResponse } from '@/core/types/interfaces/team/IRequestToJoin';
import { atom } from 'jotai';

export const requestToJoinState = atom<IJoinTeamResponse[]>([]);
