import { IIntegrationTenant } from '@/core/types/interfaces';
import { atom } from 'jotai';

export const integrationTenantState = atom<IIntegrationTenant[]>([]);
