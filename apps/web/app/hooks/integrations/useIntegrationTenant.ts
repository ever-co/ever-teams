import { getIntegrationTenantAPI } from '@app/services/client/api';
import { integrationTenantState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';

export function useIntegrationTenant() {
	const [integrationTenant, setIntegrationTenant] = useRecoilState(
		integrationTenantState
	);

	const { loading: loading, queryCall: queryCall } = useQuery(
		getIntegrationTenantAPI
	);

	const getIntegrationTenant = useCallback(
		(name: string) => {
			return queryCall(name).then((response) => {
				setIntegrationTenant(response.data.data.items);

				return response.data.data.items;
			});
		},
		[queryCall, setIntegrationTenant]
	);

	return {
		loading,
		getIntegrationTenant,
		integrationTenant,
	};
}
