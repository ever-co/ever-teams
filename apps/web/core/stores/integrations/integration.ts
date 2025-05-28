import { IIntegration } from '@/core/types/interfaces/integrations/integration';
import { atom } from 'jotai';

export const integrationState = atom<IIntegration[]>([]);
