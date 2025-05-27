import { IIntegrationTenant } from '@/core/types/interfaces/integrations/IIntegrationTenant';
import { atom } from 'jotai';

export const integrationTenantState = atom<IIntegrationTenant[]>([]);
