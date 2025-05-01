import { IRequestToJoin } from '@/core/types/interfaces';
import { atom } from 'jotai';

export const requestToJoinState = atom<IRequestToJoin[]>([]);
