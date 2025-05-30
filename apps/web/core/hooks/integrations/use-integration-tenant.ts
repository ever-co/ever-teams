import { integrationTenantService } from '@/core/services/client/api';
import { integrationTenantState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQueryCall } from '../common/use-query';
import { useGitHubIntegration } from './use-github-integration';

export function useIntegrationTenant() {
	const [integrationTenant, setIntegrationTenant] = useAtom(integrationTenantState);

	const { setIntegrationGithubRepositories } = useGitHubIntegration();

	const { loading, queryCall } = useQueryCall(integrationTenantService.getIntegrationTenant);
	const { loading: deleteLoading, queryCall: deleteQueryCall } = useQueryCall(
		integrationTenantService.deleteIntegrationTenant
	);

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
