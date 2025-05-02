import { integrationGithubMetadataState, integrationGithubRepositoriesState, userState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import { IProjectRepository } from '@/core/types/interfaces';
import { editOrganizationProjectSettingAPI, githubService } from '@/core/services/client/api';

export function useGitHubIntegration() {
	const [user] = useAtom(userState);

	const [integrationGithubMetadata, setIntegrationGithubMetadata] = useAtom(integrationGithubMetadataState);
	const [integrationGithubRepositories, setIntegrationGithubRepositories] = useAtom(
		integrationGithubRepositoriesState
	);

	const { loading: installLoading, queryCall: installQueryCall } = useQuery(
		githubService.installGitHubIntegrationAPI
	);
	const { loading: oAuthLoading, queryCall: oAuthQueryCall } = useQuery(githubService.oAuthEndpointAuthorizationAPI);
	const { loading: metadataLoading, queryCall: metadataQueryCall } = useQuery(
		githubService.getGithubIntegrationMetadataAPI
	);
	const { loading: repositoriesLoading, queryCall: repositoriesQueryCall } = useQuery(
		githubService.getGithubIntegrationRepositoriesAPI
	);
	const { loading: syncGitHubRepositoryLoading, queryCall: syncGitHubRepositoryQueryCall } = useQuery(
		githubService.syncGitHubRepositoryAPI
	);

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
				setIntegrationGithubMetadata(response.data);

				return response.data;
			});
		},
		[metadataQueryCall, setIntegrationGithubMetadata]
	);
	const getRepositories = useCallback(
		(integrationId: string) => {
			return repositoriesQueryCall(integrationId).then((response) => {
				setIntegrationGithubRepositories(response.data);

				return response.data;
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
				if (response.data.id) {
					editOrganizationProjectSettingAPI(
						projectId,
						{
							tenantId,
							organizationId,
							repositoryId: response.data.id
						},
						tenantId
					);
				}

				return response.data;
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
		setIntegrationGithubRepositories,
		syncGitHubRepository,
		syncGitHubRepositoryLoading
	};
}
