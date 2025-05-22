import { IIntegration } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const integrationState = atom<IIntegration[]>([]);
