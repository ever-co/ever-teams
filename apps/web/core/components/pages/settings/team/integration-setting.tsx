/* eslint-disable no-mixed-spaces-and-tabs */
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { useGitHubIntegration, useIntegrationTenant, useIntegrationTypes } from '@/core/hooks';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { GITHUB_APP_NAME } from '@/core/constants/config/constants';
import { useEditOrganizationProject } from '@/core/hooks/organizations/projects/use-edit-organization-project';
import { TrashIcon } from 'assets/svg';
import { Button } from '@/core/components';
import { getActiveProjectIdCookie } from '@/core/lib/helpers/index';
import { Switch } from '@headlessui/react';
import debounce from 'lodash/debounce';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import qs from 'qs';
import { InputField } from '@/core/components/duplicated-components/_input';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';

const TOGGLE_ROW = 'flex items-center justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0';
const DANGER_BUTTON =
	'h-9 shrink-0 whitespace-nowrap rounded-md border-destructive/40 bg-transparent px-3 py-0 text-sm font-medium text-destructive hover:bg-destructive/10';
const switchTrack = (on?: boolean) =>
	`${on ? 'bg-primary' : 'bg-muted-foreground/30'} relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40`;
const switchKnob = (on?: boolean) =>
	`${on ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`;

export const IntegrationSetting = () => {
	const t = useTranslations();

	const [isTasksAutoSync, setIsTasksAutoSync] = useState<boolean>();
	const [isTasksAutoSyncOnLabel, setIsTasksAutoSyncOnLabel] = useState<boolean>();
	const [syncTag, setSyncTag] = useState<string>('');
	const queryParams = useParams();
	const locale = useMemo(() => {
		return queryParams?.locale || '';
	}, [queryParams]);

	const params = useMemo(() => {
		return {
			state: `${window.location.origin}${locale ? '/' + locale : ''}/integration/github`
		} as { [x: string]: string };
	}, [locale]);

	const queries = qs.stringify(params);

	// No GitHub App configured (NEXT_PUBLIC_GITHUB_APP_NAME) => no install link: github.com/apps//... is a 404.
	const githubAppName = GITHUB_APP_NAME.value;
	const url = githubAppName ? `https://github.com/apps/${githubAppName}/installations/new?${queries.toString()}` : '';

	const activeTeam = useAtomValue(activeTeamState);

	const [selectedRepo, setSelectedRepo] = useState<string | undefined>(undefined);

	useEffect(() => {
		if (activeTeam?.projects && activeTeam?.projects?.length) {
			setIsTasksAutoSync(activeTeam?.projects?.[0]?.isTasksAutoSync || false);
			setIsTasksAutoSyncOnLabel(activeTeam?.projects?.[0]?.isTasksAutoSyncOnLabel || false);

			if (activeTeam?.projects?.[0]?.syncTag) {
				setSyncTag(activeTeam?.projects[0].syncTag);
			}
			if (activeTeam?.projects[0]?.repository?.repositoryId) {
				setSelectedRepo(`${activeTeam?.projects[0]?.repository?.repositoryId}`);
			}
		}
	}, [activeTeam]);

	const {
		integrationGithubRepositories,
		getRepositories,
		syncGitHubRepository,
		integrationGithubMetadata,
		metaData
	} = useGitHubIntegration();

	const { editOrganizationProjectSetting, editOrganizationProject } = useEditOrganizationProject();

	const {
		getIntegrationTenant,
		loading: integrationTenantLoading,
		integrationTenant,
		deleteIntegrationTenant
	} = useIntegrationTenant();

	useEffect(() => {
		if (integrationTenant && integrationTenant.length) {
			metaData(integrationTenant[0].id);
		}
	}, [metaData, integrationTenant]);

	const { getIntegrationTypes } = useIntegrationTypes();

	useEffect(() => {
		if (!integrationTenantLoading && integrationTenant && integrationTenant.length) {
			getRepositories(integrationTenant[0].id);
		}
	}, [integrationTenantLoading, integrationTenant, getRepositories]);

	useEffect(() => {
		getIntegrationTypes().then((types) => {
			const allIntegrations = types.find((item: any) => item.name === 'All Integrations');
			if (allIntegrations && allIntegrations?.id) {
				getIntegrationTenant('Github');
			}
		});
	}, [getIntegrationTypes, getIntegrationTenant]);

	const handleSelectRepo = useCallback(
		(value: string) => {
			const projectId = getActiveProjectIdCookie();

			if (projectId) {
				setSelectedRepo(value);

				const repo = integrationGithubRepositories?.repositories.find((item) => item.id === +value);

				if (repo && integrationGithubMetadata?.id) {
					syncGitHubRepository(
						`${integrationGithubMetadata?.id}`,
						repo as any,
						projectId,
						activeTeam?.tenantId as string,
						activeTeam?.organizationId as string
					);
				}
			}
		},
		[activeTeam, integrationGithubRepositories, integrationGithubMetadata, syncGitHubRepository]
	);
	const handleRemoveRepo = useCallback(() => {
		const projectId = getActiveProjectIdCookie();

		if (projectId) {
			setSelectedRepo(undefined);
			editOrganizationProjectSetting(projectId, {
				repositoryId: null,
				isTasksAutoSync: false,
				isTasksAutoSyncOnLabel: false,
				tenantId: activeTeam?.tenantId,
				organizationId: activeTeam?.organizationId
			});
		}
	}, [activeTeam, editOrganizationProjectSetting]);

	const handleEditOrganizationProject = useCallback(
		({ autoSync, autoSyncOnLabel }: { autoSync?: boolean; autoSyncOnLabel?: boolean }) => {
			const projectId = getActiveProjectIdCookie();

			if (projectId) {
				editOrganizationProject(projectId, {
					isTasksAutoSync: autoSync,
					isTasksAutoSyncOnLabel: autoSyncOnLabel,
					tenantId: activeTeam?.tenantId,
					organizationId: activeTeam?.organizationId
				});
			}
		},
		[editOrganizationProject, activeTeam]
	);
	const handleEditSyncTag = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const projectId = getActiveProjectIdCookie();

			if (projectId) {
				editOrganizationProjectSetting(projectId, {
					syncTag: e.target.value
				});
			}
		},
		[editOrganizationProjectSetting]
	);

	const handleDeleteIntegrationTenant = useCallback(() => {
		if (integrationTenant && integrationTenant.length) {
			deleteIntegrationTenant(integrationTenant[0].id).then(() => {
				getIntegrationTenant('Github');
				setSelectedRepo(undefined);
			});
		}
	}, [integrationTenant, deleteIntegrationTenant, getIntegrationTenant]);

	return (
		<div className="flex flex-col gap-4">
			<>
				<div className="flex w-full flex-wrap items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
							<GitHubLogoIcon width={20} height={20} />
						</div>

						{/* Divider */}
						<div className="h-0.5 bg-border"></div>

						<div className="flex min-w-0 flex-col">
							<div className="text-sm font-medium text-foreground">{t('pages.settingsTeam.GITHUB')}</div>

							<div className="flex flex-col text-xs text-muted-foreground">
								{integrationGithubRepositories?.total_count === 0 && (
									<div>{t('pages.settingsTeam.GITHUB_INTEGRATION_DESCRIPTION')}</div>
								)}

								<div>{t('common.GITHUB_INTEGRATION_SUBTITLE_TEXT')}</div>
							</div>
						</div>
					</div>

					{integrationGithubRepositories && integrationGithubRepositories?.total_count > 0 && (
						<Button variant="outline-danger" onClick={handleDeleteIntegrationTenant} className={DANGER_BUTTON}>
							Remove
						</Button>
					)}

					{(!integrationGithubRepositories || integrationGithubRepositories?.total_count === 0) &&
						(url ? (
							<Link
								href={url}
								className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90"
							>
								{t('pages.settingsTeam.INSTALL')}
							</Link>
						) : (
							<Button
								disabled
								className="h-9 shrink-0 rounded-md px-3 py-0 text-sm font-medium"
								title={t('common.DISABLED')}
							>
								{t('pages.settingsTeam.INSTALL')}
							</Button>
						))}
				</div>

				{integrationGithubRepositories && integrationGithubRepositories?.total_count > 0 && (
					<div className="flex flex-col">
						<div className={TOGGLE_ROW}>
							<div className="min-w-0">
								<p className="text-sm font-medium text-foreground">Auto Synk Tasks</p>
								<p className="mt-0.5 text-xs text-muted-foreground">
									{t('common.GITHUB_INTEGRATION_AUTO_SYNC_TASK_TEXT')}
								</p>
							</div>
							<Switch
								checked={isTasksAutoSync}
								onChange={() => {
									handleEditOrganizationProject({
										autoSync: !isTasksAutoSync
									});
									setIsTasksAutoSync(!isTasksAutoSync);
								}}
								className={switchTrack(isTasksAutoSync)}
							>
								<span className="sr-only">Use setting</span>
								<span aria-hidden="true" className={switchKnob(isTasksAutoSync)} />
							</Switch>
						</div>

						<div className={TOGGLE_ROW}>
							<div className="min-w-0">
								<p className="text-sm font-medium text-foreground">Sync Tasks with specific Label</p>
								<p className="mt-0.5 text-xs text-muted-foreground">
									{t('common.GITHUB_INTEGRATION_LABEL_SYNC_TASK_TEXT')}
								</p>
							</div>
							<Switch
								checked={isTasksAutoSyncOnLabel}
								onChange={() => {
									handleEditOrganizationProject({
										autoSyncOnLabel: !isTasksAutoSyncOnLabel
									});
									setIsTasksAutoSyncOnLabel(!isTasksAutoSyncOnLabel);
								}}
								className={switchTrack(isTasksAutoSyncOnLabel)}
							>
								<span className="sr-only">Use setting</span>
								<span aria-hidden="true" className={switchKnob(isTasksAutoSyncOnLabel)} />
							</Switch>
						</div>

						<div className="flex w-full flex-wrap items-center gap-2 border-t border-border pt-4">
							<Select value={selectedRepo || undefined} onValueChange={handleSelectRepo}>
								<SelectTrigger className="h-9 w-full max-w-sm overflow-hidden text-ellipsis whitespace-nowrap rounded-md border-border bg-card text-sm text-foreground focus:ring-0 focus:ring-offset-0">
									<SelectValue placeholder={t('pages.settingsTeam.SELECT_REPOSITORY')} />
								</SelectTrigger>
								<SelectContent className="w-96">
									{integrationGithubRepositories?.repositories?.map((item) => (
										<SelectItem key={item.id} value={`${item.id}`} className="focus:ring-0">
											{item.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{selectedRepo && (
								<Button
									variant="ghost"
									className="size-8 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
									onClick={handleRemoveRepo}
								>
									<TrashIcon className="size-4" />
								</Button>
							)}

							{integrationGithubRepositories?.total_count > 0 && (
								<InputField
									onChange={debounce(handleEditSyncTag, 1000)}
									defaultValue={syncTag}
									placeholder={t('common.GITHUB_AUTO_SYNC_LABEL')}
									className="h-9"
									wrapperClassName="mb-0 w-full max-w-xs"
								/>
							)}
						</div>
					</div>
				)}
			</>
		</div>
	);
};
