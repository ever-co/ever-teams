import { integrationGithubMetadataState, integrationGithubRepositoriesState, userState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../common/use-query';
import { githubService } from '@/core/services/client/api';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { IOrganizationProjectRepository } from '@/core/types/interfaces/project/organization-project';

export function useGitHubIntegration() {
	const [user] = useAtom(userState);

	const [integrationGithubMetadata, setIntegrationGithubMetadata] = useAtom(integrationGithubMetadataState);
	const [integrationGithubRepositories, setIntegrationGithubRepositories] = useAtom(
		integrationGithubRepositoriesState
	);

	const { loading: installLoading, queryCall: installQueryCall } = useQuery(githubService.installGitHubIntegration);
	const { loading: oAuthLoading, queryCall: oAuthQueryCall } = useQuery(githubService.oAuthEndpointAuthorization);
	const { loading: metadataLoading, queryCall: metadataQueryCall } = useQuery(
		githubService.getGithubIntegrationMetadata
	);
	const { loading: repositoriesLoading, queryCall: repositoriesQueryCall } = useQuery(
		githubService.getGithubIntegrationRepositories
	);
	const { loading: syncGitHubRepositoryLoading, queryCall: syncGitHubRepositoryQueryCall } = useQuery(
		githubService.syncGitHubRepository
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
			repository: IOrganizationProjectRepository,
			projectId: string,
			tenantId: string,
			organizationId: string
		) => {
			return syncGitHubRepositoryQueryCall({
				installationId,
				repository
			}).then((response) => {
				if (response.data.id) {
					organizationProjectService.editOrganizationProjectSetting(
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
