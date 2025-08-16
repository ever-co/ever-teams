import { integrationGithubMetadataState, integrationGithubRepositoriesState } from '@/core/stores';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { githubService } from '@/core/services/client/api';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { IOrganizationProjectRepository } from '@/core/types/interfaces/project/organization-project';
import { IGithubMetadata } from '@/core/types/interfaces/integrations/github-metadata';
import { IGithubRepositories } from '@/core/types/interfaces/integrations/github-repositories';
import { useUserQuery } from '../queries/user-user.query';

export function useGitHubIntegration() {
	const { data: user } = useUserQuery();
	const queryClient = useQueryClient(); // Phase 2: Now used for mutations

	const [integrationGithubMetadata, setIntegrationGithubMetadata] = useAtom(integrationGithubMetadataState);
	const [integrationGithubRepositories, setIntegrationGithubRepositories] = useAtom(
		integrationGithubRepositoriesState
	);

	// Memoize cookies to avoid re-reading on every render
	const tenantId = useMemo(() => getTenantIdCookie() || '', []);
	const organizationId = useMemo(() => getOrganizationIdCookie() || '', []);

	// State to track current integration IDs for React Query
	const [metadataIntegrationId, setMetadataIntegrationId] = useState<string | null>(null);
	const [repositoriesIntegrationId, setRepositoriesIntegrationId] = useState<string | null>(null);

	// React Query for GitHub metadata
	const metadataQuery = useQuery({
		queryKey: metadataIntegrationId
			? queryKeys.integrations.github.metadata(tenantId, organizationId, metadataIntegrationId)
			: ['integrations', 'github', 'metadata', 'disabled'],
		queryFn: () => {
			if (!metadataIntegrationId) throw new Error('Integration ID is required for metadata');
			return githubService.getGithubIntegrationMetadata({ integrationId: metadataIntegrationId });
		},
		enabled: !!metadataIntegrationId,
		staleTime: 1000 * 60 * 30, // GitHub metadata is relatively stable, cache for 30 minutes
		gcTime: 1000 * 60 * 60 // Keep in cache for 1 hour
	});

	// React Query for GitHub repositories
	const repositoriesQuery = useQuery({
		queryKey: repositoriesIntegrationId
			? queryKeys.integrations.github.repositories(tenantId, organizationId, repositoriesIntegrationId)
			: ['integrations', 'github', 'repositories', 'disabled'],
		queryFn: () => {
			if (!repositoriesIntegrationId) throw new Error('Integration ID is required for repositories');
			return githubService.getGithubIntegrationRepositories({ integrationId: repositoriesIntegrationId });
		},
		enabled: !!repositoriesIntegrationId
	});

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (metadataQuery.data) {
			setIntegrationGithubMetadata(metadataQuery.data as IGithubMetadata);
		}
	}, [metadataQuery.data, setIntegrationGithubMetadata]);

	useEffect(() => {
		if (repositoriesQuery.data) {
			setIntegrationGithubRepositories(repositoriesQuery.data as IGithubRepositories);
		}
	}, [repositoriesQuery.data, setIntegrationGithubRepositories]);

	// Phase 2: React Query mutations for install and oauth
	const installGitHubMutation = useMutation({
		mutationFn: (params: { installation_id: string; setup_action: string }) =>
			githubService.installGitHubIntegration({
				tenantId: user?.tenantId as string,
				organizationId: user?.employee?.organizationId as string,
				installation_id: params.installation_id,
				setup_action: params.setup_action
			}),
		onSuccess: () => {
			// Invalidate GitHub-related queries after successful installation
			queryClient.invalidateQueries({
				queryKey: queryKeys.integrations.github.all
			});
		}
	});

	const oAuthGitHubMutation = useMutation({
		mutationFn: (params: { code: string; state: string }) => {
			// Safely parse state parameter
			const stateParts = params.state.split('_');
			if (stateParts.length !== 2) {
				throw new Error(
					`Invalid state format: ${params.state}. Expected format: 'installation_id_setup_action'`
				);
			}

			return githubService.oAuthEndpointAuthorization({
				tenantId: user?.tenantId as string,
				organizationId: user?.employee?.organizationId as string,
				installation_id: stateParts[0],
				setup_action: stateParts[1],
				code: params.code
			});
		},
		onSuccess: () => {
			// Invalidate GitHub-related queries after successful OAuth
			queryClient.invalidateQueries({
				queryKey: queryKeys.integrations.github.all
			});
		}
	});

	// Phase 3: React Query mutation for sync (complex mutation with side-effects)
	const syncGitHubRepositoryMutation = useMutation({
		mutationFn: async (params: {
			installationId: string;
			repository: IOrganizationProjectRepository;
			projectId: string;
			tenantId: string;
			organizationId: string;
		}) => {
			// 1. Main API call - sync GitHub repository
			const syncResult = await githubService.syncGitHubRepository({
				installationId: params.installationId,
				repository: params.repository
			});

			// 2. Side-effect - update organization project settings if sync successful
			if (syncResult.data?.id) {
				await organizationProjectService.editOrganizationProjectSetting({
					organizationProjectId: params.projectId,
					data: {
						tenantId: params.tenantId,
						organizationId: params.organizationId,
						repositoryId: syncResult.data.id
					}
				});
			}

			return syncResult.data;
		},
		onSuccess: () => {
			// 3. Intelligent cache invalidation for related data
			queryClient.invalidateQueries({
				queryKey: queryKeys.integrations.github.all
			});
			// Note: Organization projects invalidation would be added when that hook is migrated
		}
	});

	// Phase 2: Migrated mutation functions using React Query
	const installGitHub = useCallback(
		async (installation_id: string, setup_action: string) => {
			return await installGitHubMutation.mutateAsync({
				installation_id,
				setup_action
			});
		},
		[installGitHubMutation]
	);

	const oAuthGitHub = useCallback(
		async (installation_id: string, setup_action: string, code: string) => {
			return await oAuthGitHubMutation.mutateAsync({
				code,
				state: `${installation_id}_${setup_action}` // Combine installation_id and setup_action as state
			});
		},
		[oAuthGitHubMutation]
	);
	// Phase 1: Migrated GET functions using React Query
	// OPTIMIZATION: Let React Query handle caching automatically instead of manual fetchQuery
	const metaData = useCallback((integrationId: string) => {
		// React Query will handle caching, stale time, and refetching automatically
		// No need for manual cache checks or fetchQuery - this follows React Query best practices
		// The data will be available through the metadataQuery.data
		// Set integration ID to trigger React Query
		setMetadataIntegrationId(integrationId);
	}, []);

	const getRepositories = useCallback(async (integrationId: string) => {
		// Set integration ID to trigger React Query
		setRepositoriesIntegrationId(integrationId);

		// React Query will handle caching, stale time, and refetching automatically
		// No need for manual cache checks or fetchQuery - this follows React Query best practices
		// The data will be available through the repositoriesQuery.data
	}, []);
	// Phase 3: Migrated sync function using React Query mutation (maintains exact same interface)
	const syncGitHubRepository = useCallback(
		async (
			installationId: string,
			repository: IOrganizationProjectRepository,
			projectId: string,
			tenantId: string,
			organizationId: string
		) => {
			return await syncGitHubRepositoryMutation.mutateAsync({
				installationId,
				repository,
				projectId,
				tenantId,
				organizationId
			});
		},
		[syncGitHubRepositoryMutation]
	);

	return {
		// Phase 1: Migrated GET operations with React Query
		metaData,
		metadataLoading: metadataQuery.isLoading,
		getRepositories,
		repositoriesLoading: repositoriesQuery.isLoading,
		integrationGithubMetadata,
		integrationGithubRepositories,
		setIntegrationGithubRepositories,

		// Phase 2: Migrated mutation operations with React Query
		installGitHub,
		installLoading: installGitHubMutation.isPending,
		oAuthGitHub,
		oAuthLoading: oAuthGitHubMutation.isPending,

		// Phase 3: Migrated sync operation with React Query
		syncGitHubRepository,
		syncGitHubRepositoryLoading: syncGitHubRepositoryMutation.isPending,

		// Additional React Query states
		metadataError: metadataQuery.error,
		repositoriesError: repositoriesQuery.error,
		installError: installGitHubMutation.error,
		oAuthError: oAuthGitHubMutation.error,
		syncGitHubRepositoryError: syncGitHubRepositoryMutation.error,
		metadataRefetch: metadataQuery.refetch,
		repositoriesRefetch: repositoriesQuery.refetch,

		// Backward compatibility (deprecated - use new error states)
		installQueryCall: installGitHub, // Backward compatibility alias
		oAuthQueryCall: oAuthGitHub // Backward compatibility alias
	};
}
