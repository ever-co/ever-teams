import { IIntegrationType } from '@app/interfaces';
import { atom } from 'jotai';

export const integrationTypesState = atom<IIntegrationType[]>([]);
