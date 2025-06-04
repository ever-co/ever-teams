import { IIntegrationTenant } from '@/core/types/interfaces/integrations/integration-tenant';
import { atom } from 'jotai';

export const integrationTenantState = atom<IIntegrationTenant[]>([]);
