import { IIntegrationTenant } from '@app/interfaces';
import { atom } from 'recoil';

export const integrationTenantState = atom<IIntegrationTenant | null>({
	key: 'integrationTenantState',
	default: null,
});
