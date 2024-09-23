import { IIntegration } from '@app/interfaces';
import { atom } from 'jotai';

export const integrationState = atom<IIntegration[]>([]);
