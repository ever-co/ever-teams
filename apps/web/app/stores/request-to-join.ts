import { IRequestToJoin } from '@app/interfaces/';
import { atom } from 'recoil';

export const requestToJoinState = atom<IRequestToJoin[]>({
	key: 'requestToJoinState',
	default: []
});
