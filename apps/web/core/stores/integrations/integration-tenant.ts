import { IIntegrationTenant } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const integrationTenantState = atom<IIntegrationTenant[]>([]);
