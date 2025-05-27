import { IIntegration } from '@/core/types/interfaces/integrations/IIntegration';
import { atom } from 'jotai';

export const integrationState = atom<IIntegration[]>([]);
