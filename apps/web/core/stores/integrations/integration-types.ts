import { IIntegrationType } from '@/core/types/interfaces/integrations/IIntegrationType';
import { atom } from 'jotai';

export const integrationTypesState = atom<IIntegrationType[]>([]);
