import { deleteIntegrationTenantAPI, getIntegrationTenantAPI } from '@app/services/client/api';
import { integrationTenantState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';
import { useGitHubIntegration } from './useGitHubIntegration';

export function useIntegrationTenant() {
	const [integrationTenant, setIntegrationTenant] = useRecoilState(integrationTenantState);

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
