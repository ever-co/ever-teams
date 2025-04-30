import { IIntegration } from '@/core/types/interfaces';
import { atom } from 'jotai';

export const integrationState = atom<IIntegration[]>([]);
