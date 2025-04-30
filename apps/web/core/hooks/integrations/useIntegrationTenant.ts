import { deleteIntegrationTenantAPI, getIntegrationTenantAPI } from '@/core/services/client/api';
import { integrationTenantState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import { useGitHubIntegration } from './useGitHubIntegration';

export function useIntegrationTenant() {
	const [integrationTenant, setIntegrationTenant] = useAtom(integrationTenantState);

	const { setIntegrationGithubRepositories } = useGitHubIntegration();

	const { loading: loading, queryCall: queryCall } = useQuery(getIntegrationTenantAPI);
	const { loading: deleteLoading, queryCall: deleteQueryCall } = useQuery(deleteIntegrationTenantAPI);

	const getIntegrationTenant = useCallback(
		(name: string) => {
			return queryCall(name).then((response) => {
				setIntegrationTenant(response.data.items);

				return response.data.items;
			});
		},
		[queryCall, setIntegrationTenant]
	);

	const deleteIntegrationTenant = useCallback(
		(integrationId: string) => {
			return deleteQueryCall(integrationId).then(() => {
				setIntegrationTenant([]);
				setIntegrationGithubRepositories(null);
			});
		},
		[deleteQueryCall, setIntegrationTenant, setIntegrationGithubRepositories]
	);

	return {
		loading,
		getIntegrationTenant,
		integrationTenant,
		deleteIntegrationTenant,
		deleteLoading
	};
}
