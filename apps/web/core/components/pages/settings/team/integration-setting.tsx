/* eslint-disable no-mixed-spaces-and-tabs */
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { useGitHubIntegration, useIntegrationTenant, useIntegrationTypes } from '@/core/hooks';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { GITHUB_APP_NAME } from '@/core/constants/config/constants';
import { useEditOrganizationProject } from '@/core/hooks/organizations/projects/use-edit-organization-project';
import { IconsGithubFilled, Trash } from '@/core/components/icons';
import { SWITCH_THUMB_CLASS, SWITCH_TRACK_CLASS } from '../switch-recipe';
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

const INTEGRATION_ROW = 'flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0';
const LOGO_TILE =
	'flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-foreground shadow-sm shadow-black/6.5 hairline-ring ring-border';

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

	const hasRepositories = Boolean(integrationGithubRepositories && integrationGithubRepositories?.total_count > 0);
	const hasNoRepositories = !integrationGithubRepositories || integrationGithubRepositories?.total_count === 0;
	const showsInstallLink = hasNoRepositories && Boolean(url);
	const showsInstallUnavailable = hasNoRepositories && !url;

	return (
		<div className="flex flex-col hairline-divide-y divide-border">
			<div className={INTEGRATION_ROW}>
				<div className="flex min-w-0 items-center gap-3">
					<div className={LOGO_TILE}>
						<IconsGithubFilled className="size-5" />
					</div>

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

				{hasRepositories && (
					<Button
						variant="outline-danger"
						size="default"
						onClick={handleDeleteIntegrationTenant}
						className="shrink-0"
					>
						{t('common.REMOVE')}
					</Button>
				)}

				{showsInstallLink && (
					<Button asChild size="default" className="shrink-0">
						<Link href={url}>{t('pages.settingsTeam.INSTALL')}</Link>
					</Button>
				)}
				{showsInstallUnavailable && (
					<Button disabled size="default" className="shrink-0" title={t('common.DISABLED')}>
						{t('pages.settingsTeam.INSTALL')}
					</Button>
				)}
			</div>

			{hasRepositories && (
				<div className={INTEGRATION_ROW}>
					<div className="min-w-0">
						<p className="text-sm font-medium text-foreground">{t('pages.settingsTeam.AUTO_SYNC_TASKS')}</p>
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
						className={SWITCH_TRACK_CLASS}
					>
						<span className="sr-only">{t('common.USE_SETTING')}</span>
						<span aria-hidden="true" className={SWITCH_THUMB_CLASS} />
					</Switch>
				</div>
			)}

			{hasRepositories && (
				<div className={INTEGRATION_ROW}>
					<div className="min-w-0">
						<p className="text-sm font-medium text-foreground">
							{t('pages.settingsTeam.SYNC_TASKS_WITH_LABEL')}
						</p>
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
						className={SWITCH_TRACK_CLASS}
					>
						<span className="sr-only">{t('common.USE_SETTING')}</span>
						<span aria-hidden="true" className={SWITCH_THUMB_CLASS} />
					</Switch>
				</div>
			)}

			{hasRepositories && (
				<div className="flex w-full flex-wrap items-center gap-2 py-4 last:pb-0">
					<Select value={selectedRepo || undefined} onValueChange={handleSelectRepo}>
						<SelectTrigger className="h-9 w-full max-w-sm overflow-hidden text-ellipsis whitespace-nowrap">
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
							size="icon"
							className="shrink-0 text-destructive-ink hover:text-destructive-ink"
							onClick={handleRemoveRepo}
						>
							<Trash className="size-4" />
						</Button>
					)}

					{hasRepositories && (
						<InputField
							onChange={debounce(handleEditSyncTag, 1000)}
							defaultValue={syncTag}
							placeholder={t('common.GITHUB_AUTO_SYNC_LABEL')}
							className="h-9"
							wrapperClassName="mb-0 w-full max-w-xs"
						/>
					)}
				</div>
			)}
		</div>
	);
};
