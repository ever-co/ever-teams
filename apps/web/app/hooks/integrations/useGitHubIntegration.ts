import {
	getGithubIntegrationMetadataAPI,
	getGithubIntegrationRepositoriesAPI,
	installGitHubIntegrationAPI,
	oAuthEndpointAuthorizationAPI,
	syncGitHubRepositoryAPI
} from '@app/services/client/api/integrations/github';
import { integrationGithubMetadataState, integrationGithubRepositoriesState, userState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';
import { IProjectRepository } from '@app/interfaces';
import { editOrganizationProjectSettingAPI } from '@app/services/client/api';

export function useGitHubIntegration() {
	const [user] = useRecoilState(userState);

	const [integrationGithubMetadata, setIntegrationGithubMetadata] = useRecoilState(integrationGithubMetadataState);
	const [integrationGithubRepositories, setIntegrationGithubRepositories] = useRecoilState(
		integrationGithubRepositoriesState
	);

	const { loading: installLoading, queryCall: installQueryCall } = useQuery(installGitHubIntegrationAPI);
	const { loading: oAuthLoading, queryCall: oAuthQueryCall } = useQuery(oAuthEndpointAuthorizationAPI);
	const { loading: metadataLoading, queryCall: metadataQueryCall } = useQuery(getGithubIntegrationMetadataAPI);
	const { loading: repositoriesLoading, queryCall: repositoriesQueryCall } = useQuery(
		getGithubIntegrationRepositoriesAPI
	);
	const { loading: syncGitHubRepositoryLoading, queryCall: syncGitHubRepositoryQueryCall } =
		useQuery(syncGitHubRepositoryAPI);

	const installGitHub = useCallback(
		(installation_id: string, setup_action: string) => {
			return installQueryCall({
				tenantId: user?.tenantId as string,
				organizationId: user?.employee?.organizationId as string,
				installation_id,
				setup_action
			});
		},
		[installQueryCall, user]
	);
	const oAuthGitHub = useCallback(
		(installation_id: string, setup_action: string, code: string) => {
			return oAuthQueryCall({
				tenantId: user?.tenantId as string,
				organizationId: user?.employee?.organizationId as string,
				installation_id,
				setup_action,
				code
			});
		},
		[oAuthQueryCall, user]
	);
	const metaData = useCallback(
		(integrationId: string) => {
			return metadataQueryCall(integrationId).then((response) => {
				setIntegrationGithubMetadata(response.data.data);

				return response.data.data;
			});
		},
		[metadataQueryCall, setIntegrationGithubMetadata]
	);
	const getRepositories = useCallback(
		(integrationId: string) => {
			return repositoriesQueryCall(integrationId).then((response) => {
				setIntegrationGithubRepositories(response.data.data);

				return response.data.data;
			});
		},
		[repositoriesQueryCall, setIntegrationGithubRepositories]
	);
	const syncGitHubRepository = useCallback(
		(
			installationId: string,
			repository: IProjectRepository,
			projectId: string,
			tenantId: string,
			organizationId: string
		) => {
			return syncGitHubRepositoryQueryCall({
				installationId,
				repository
			}).then((response) => {
				if (response.data.data.id) {
					editOrganizationProjectSettingAPI(
						projectId,
						{
							tenantId,
							organizationId,
							repositoryId: response.data.data.id
						},
						tenantId
					);
				}

				return response.data.data;
			});
		},
		[syncGitHubRepositoryQueryCall]
	);

	return {
		installLoading,
		installQueryCall,
		installGitHub,
		oAuthLoading,
		oAuthQueryCall,
		oAuthGitHub,
		metaData,
		metadataLoading,
		getRepositories,
		repositoriesLoading,
		integrationGithubMetadata,
		integrationGithubRepositories,
		syncGitHubRepository,
		syncGitHubRepositoryLoading
	};
}
