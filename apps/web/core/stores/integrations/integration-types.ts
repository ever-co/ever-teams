import { IIntegrationType } from '@/core/types/interfaces/integrations/integration-type';
import { atom } from 'jotai';

export const integrationTypesState = atom<IIntegrationType[]>([]);
