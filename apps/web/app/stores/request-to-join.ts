import { IRequestToJoin } from '@app/interfaces/';
import { atom } from 'jotai';

export const requestToJoinState = atom<IRequestToJoin[]>([]);
