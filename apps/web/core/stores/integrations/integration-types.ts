import { IIntegrationType } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const integrationTypesState = atom<IIntegrationType[]>([]);
