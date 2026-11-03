'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { useGitHubIntegration } from '@/core/hooks/integrations/use-github-integration';
import { useIntegrationTenant } from '@/core/hooks/integrations/use-integration-tenant';
import { useIntegrationTypes } from '@/core/hooks/integrations/use-integration-types';
import { useEditOrganizationProject } from '@/core/hooks/organizations/projects/use-edit-organization-project';
import { GITHUB_APP_NAME } from '@/core/constants/config/constants';
import { queryKeys } from '@/core/query/keys';
import { activeTeamState } from '@/core/stores';
import {
	firstIntegrationIdOf,
	githubConnectionStatusOf,
	GithubConnectionInput,
	GithubConnectionStatus,
	githubInstallationFactsOf,
	GithubInstallationFacts,
	githubInstallUrlOf,
	GithubProjectSettings,
	githubProjectSettingsOf,
	githubReadErrorOf,
	GithubRepositoryOption,
	githubSettingsSnapshotKeyOf,
	GITHUB_INTEGRATION_TENANT_NAME,
	hasIntegrationCatalog,
	repositoryOfId,
	repositoryOptionsOf,
	teamGithubProjectOf
} from '@/core/lib/utils/settings-integrations';

type PendingControl = 'autoSync' | 'labelSync' | 'repository';

type PendingControls = Readonly<Record<PendingControl, boolean>>;

const NO_PENDING: PendingControls = { autoSync: false, labelSync: false, repository: false };

interface LocalEdits {
	snapshotKey: string;
	values: Partial<GithubProjectSettings>;
}

export interface GithubIntegrationProject {
	id: string;
	name: string;
}

export interface GithubIntegrationSettings {
	status: GithubConnectionStatus;
	readError: unknown;
	isRetrying: boolean;
	retry: () => void;
	installUrl: string;
	facts: GithubInstallationFacts;
	repositoryCount: number;
	repositoryOptions: GithubRepositoryOption[];
	project: GithubIntegrationProject | null;
	settings: GithubProjectSettings;
	pending: PendingControls;
	setAutoSync: (enabled: boolean) => void;
	setLabelSync: (enabled: boolean) => void;
	saveSyncTag: (tag: string) => Promise<void>;
	linkRepository: (repositoryId: string) => void;
	unlinkRepository: () => void;
	removeIntegration: () => Promise<void>;
	isRemoving: boolean;
}

function currentOrigin(): string {
	if (typeof window === 'undefined') {
		return '';
	}
	return window.location.origin;
}

function localeParamOf(params: ReturnType<typeof useParams>): string {
	const locale = params?.locale;
	if (typeof locale !== 'string') {
		return '';
	}
	return locale;
}

function editsOn(edits: LocalEdits | null, snapshotKey: string): Partial<GithubProjectSettings> {
	if (!edits) {
		return {};
	}
	if (edits.snapshotKey !== snapshotKey) {
		return {};
	}
	return edits.values;
}

export function useGithubIntegrationSettings(): GithubIntegrationSettings {
	const queryClient = useQueryClient();
	const params = useParams();
	const activeTeam = useAtomValue(activeTeamState);

	const types = useIntegrationTypes();
	const hasCatalog = hasIntegrationCatalog(types.data);
	let tenantName: string | null = null;
	if (hasCatalog) {
		tenantName = GITHUB_INTEGRATION_TENANT_NAME;
	}
	const tenant = useIntegrationTenant(tenantName);
	const integrationId = firstIntegrationIdOf(tenant.items);

	const github = useGitHubIntegration();
	const { metaData, getRepositories, syncGitHubRepository } = github;
	const { editOrganizationProject, editOrganizationProjectSetting } = useEditOrganizationProject();
	const { deleteIntegrationTenant, refetch: refetchTenant } = tenant;

	useEffect(() => {
		if (!integrationId) {
			return;
		}
		metaData(integrationId);
		getRepositories(integrationId);
	}, [integrationId, metaData, getRepositories]);

	const connection: GithubConnectionInput = {
		types: types.data,
		typesError: types.error,
		tenantItems: tenant.items,
		tenantError: tenant.readError,
		metadata: github.metadata,
		metadataError: github.metadataError,
		repositories: github.repositories,
		repositoriesError: github.repositoriesError
	};
	const status = githubConnectionStatusOf(connection);
	const readError = githubReadErrorOf(connection);
	const facts = useMemo(() => githubInstallationFactsOf(github.metadata), [github.metadata]);

	const projectEntity = teamGithubProjectOf(activeTeam);
	const projectId = projectEntity?.id ?? null;
	const serverSettings = useMemo(() => githubProjectSettingsOf(projectEntity), [projectEntity]);
	const snapshotKey = githubSettingsSnapshotKeyOf(projectId, serverSettings);
	const [edits, setEdits] = useState<LocalEdits | null>(null);
	const settings = useMemo(
		() => ({ ...serverSettings, ...editsOn(edits, snapshotKey) }),
		[serverSettings, edits, snapshotKey]
	);
	const [pending, setPending] = useState<PendingControls>(NO_PENDING);
	const [isRetrying, setIsRetrying] = useState(false);
	const [isRemoving, setIsRemoving] = useState(false);

	const tenantId = activeTeam?.tenantId ?? undefined;
	const organizationId = activeTeam?.organizationId ?? undefined;

	const applyEdits = useCallback(
		(values: Partial<GithubProjectSettings>) => {
			setEdits((previous) => ({
				snapshotKey,
				values: { ...editsOn(previous, snapshotKey), ...values }
			}));
		},
		[snapshotKey]
	);

	const markPending = useCallback((control: PendingControl, isPending: boolean) => {
		setPending((previous) => ({ ...previous, [control]: isPending }));
	}, []);

	const setAutoSync = useCallback(
		async (enabled: boolean) => {
			if (!projectId) {
				return;
			}
			const previous = settings.isTasksAutoSync;
			applyEdits({ isTasksAutoSync: enabled });
			markPending('autoSync', true);
			const saved = await editOrganizationProject(projectId, {
				isTasksAutoSync: enabled,
				tenantId,
				organizationId
			});
			// The hook reports the failure (global toast) and resolves without a project.
			if (!saved) {
				applyEdits({ isTasksAutoSync: previous });
			}
			markPending('autoSync', false);
		},
		[
			projectId,
			settings.isTasksAutoSync,
			applyEdits,
			markPending,
			editOrganizationProject,
			tenantId,
			organizationId
		]
	);

	const setLabelSync = useCallback(
		async (enabled: boolean) => {
			if (!projectId) {
				return;
			}
			const previous = settings.isTasksAutoSyncOnLabel;
			applyEdits({ isTasksAutoSyncOnLabel: enabled });
			markPending('labelSync', true);
			const saved = await editOrganizationProject(projectId, {
				isTasksAutoSyncOnLabel: enabled,
				tenantId,
				organizationId
			});
			if (!saved) {
				applyEdits({ isTasksAutoSyncOnLabel: previous });
			}
			markPending('labelSync', false);
		},
		[
			projectId,
			settings.isTasksAutoSyncOnLabel,
			applyEdits,
			markPending,
			editOrganizationProject,
			tenantId,
			organizationId
		]
	);

	const saveSyncTag = useCallback(
		async (tag: string) => {
			if (!projectId) {
				return;
			}
			await editOrganizationProjectSetting(projectId, { syncTag: tag });
			applyEdits({ syncTag: tag });
		},
		[projectId, editOrganizationProjectSetting, applyEdits]
	);

	const installationId = github.metadata?.id;
	const repositories = github.repositories;

	const linkRepository = useCallback(
		async (repositoryId: string) => {
			if (!projectId) {
				return;
			}
			if (installationId === undefined) {
				return;
			}
			const repository = repositoryOfId(repositories, repositoryId);
			if (!repository) {
				return;
			}
			const previous = {
				linkedRepositoryId: settings.linkedRepositoryId,
				linkedRepositoryName: settings.linkedRepositoryName
			};
			applyEdits({ linkedRepositoryId: repositoryId, linkedRepositoryName: repository.full_name });
			markPending('repository', true);
			try {
				await syncGitHubRepository(
					String(installationId),
					repository,
					projectId,
					tenantId ?? '',
					organizationId ?? ''
				);
			} catch {
				applyEdits(previous);
			} finally {
				markPending('repository', false);
			}
		},
		[
			repositories,
			installationId,
			projectId,
			settings.linkedRepositoryId,
			settings.linkedRepositoryName,
			applyEdits,
			markPending,
			syncGitHubRepository,
			tenantId,
			organizationId
		]
	);

	const unlinkRepository = useCallback(async () => {
		if (!projectId) {
			return;
		}
		const previous = {
			linkedRepositoryId: settings.linkedRepositoryId,
			linkedRepositoryName: settings.linkedRepositoryName,
			isTasksAutoSync: settings.isTasksAutoSync,
			isTasksAutoSyncOnLabel: settings.isTasksAutoSyncOnLabel
		};
		applyEdits({
			linkedRepositoryId: null,
			linkedRepositoryName: null,
			isTasksAutoSync: false,
			isTasksAutoSyncOnLabel: false
		});
		markPending('repository', true);
		try {
			await editOrganizationProjectSetting(projectId, {
				customFields: { repositoryId: null },
				isTasksAutoSync: false,
				isTasksAutoSyncOnLabel: false,
				tenantId,
				organizationId
			});
		} catch {
			applyEdits(previous);
		} finally {
			markPending('repository', false);
		}
	}, [projectId, settings, applyEdits, markPending, editOrganizationProjectSetting, tenantId, organizationId]);

	const removeIntegration = useCallback(async () => {
		if (!integrationId) {
			return;
		}
		setIsRemoving(true);
		try {
			await deleteIntegrationTenant(integrationId);
			await refetchTenant();
		} finally {
			setIsRemoving(false);
		}
	}, [integrationId, deleteIntegrationTenant, refetchTenant]);

	const retry = useCallback(() => {
		setIsRetrying(true);
		void queryClient
			.refetchQueries({ queryKey: queryKeys.integrations.all, type: 'active' })
			.finally(() => setIsRetrying(false));
	}, [queryClient]);

	const repositoryOptions = useMemo(() => repositoryOptionsOf(repositories, settings), [repositories, settings]);
	const installUrl = githubInstallUrlOf(GITHUB_APP_NAME.value, currentOrigin(), localeParamOf(params));

	let project: GithubIntegrationProject | null = null;
	if (projectEntity) {
		project = { id: projectEntity.id, name: projectEntity.name };
	}

	return {
		status,
		readError,
		isRetrying,
		retry,
		installUrl,
		facts,
		repositoryCount: repositories?.total_count ?? 0,
		repositoryOptions,
		project,
		settings,
		pending,
		setAutoSync: (enabled) => void setAutoSync(enabled),
		setLabelSync: (enabled) => void setLabelSync(enabled),
		saveSyncTag,
		linkRepository: (repositoryId) => void linkRepository(repositoryId),
		unlinkRepository: () => void unlinkRepository(),
		removeIntegration,
		isRemoving
	};
}
