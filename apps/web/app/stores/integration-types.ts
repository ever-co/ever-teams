import { IIntegrationType } from '@app/interfaces';
import { atom } from 'recoil';

export const integrationTypesState = atom<IIntegrationType[]>({
	key: 'integrationTypesState',
	default: []
});
