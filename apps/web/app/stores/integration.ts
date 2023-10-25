import { IIntegration } from '@app/interfaces';
import { atom } from 'recoil';

export const integrationState = atom<IIntegration[]>({
	key: 'integrationState',
	default: []
});
