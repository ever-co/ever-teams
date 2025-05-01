import { IIntegrationType } from '@/core/types/interfaces';
import { atom } from 'jotai';

export const integrationTypesState = atom<IIntegrationType[]>([]);
