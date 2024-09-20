import { IIntegrationTenant } from '@app/interfaces';
import { atom } from 'jotai';

export const integrationTenantState = atom<IIntegrationTenant[]>([]);
