import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { useGitHubIntegration, useIntegrationTenant, useIntegrationTypes, useOrganizationTeams } from '@app/hooks';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { GITHUB_APP_NAME } from '@app/constants';
import Link from 'next/link';
import { useOrganizationProjects } from '@app/hooks';
import { TrashIcon } from 'lib/components/svgs';
import { Button, InputField, Text } from 'lib/components';
import { getActiveProjectIdCookie } from '@app/helpers';
import { Switch } from '@headlessui/react';
import debounce from 'lodash/debounce';

export const IntegrationSetting = () => {
	const { trans } = useTranslation('settingsTeam');

	const [isTasksAutoSync, setIsTasksAutoSync] = useState<boolean>();
	const [isTasksAutoSyncOnLabel, setIsTasksAutoSyncOnLabel] = useState<boolean>();
	const [syncTag, setSyncTag] = useState<string>('');

	const params = useMemo(() => {
		return {
			state: `${window.location.origin}/integration/github`
		} as { [x: string]: string };
	}, []);

	const queries = new URLSearchParams(params || {});
	const url = `https://github.com/apps/${GITHUB_APP_NAME}/installations/new?${queries.toString()}`;

	const { activeTeam } = useOrganizationTeams();

	const [selectedRepo, setSelectedRepo] = useState<string | undefined>(undefined);

	useEffect(() => {

		if (activeTeam?.projects && activeTeam?.projects?.length) {
			setIsTasksAutoSync(activeTeam?.projects[0].isTasksAutoSync);
			setIsTasksAutoSyncOnLabel(activeTeam?.projects[0].isTasksAutoSyncOnLabel);

			if (activeTeam?.projects[0].syncTag) {
				setSyncTag(activeTeam?.projects[0].syncTag);
			}
			if(activeTeam?.projects[0]?.repository?.repositoryId) {
				setSelectedRepo(`${activeTeam?.projects[0]?.repository?.repositoryId}`);
			}
		}
	}, [activeTeam]);

	const { integrationGithubRepositories, getRepositories } = useGitHubIntegration();


	const { editOrganizationProjectSetting, editOrganizationProject } = useOrganizationProjects();

	const { getIntegrationTenant, loading: integrationTenantLoading, integrationTenant } = useIntegrationTenant();

	const { loading: loadingIntegrationTypes, integrationTypes, getIntegrationTypes } = useIntegrationTypes();

	useEffect(() => {
		if (!integrationTenantLoading && integrationTenant && integrationTenant.length) {
			getRepositories(integrationTenant[0].id);
		}
	}, [integrationTenantLoading, integrationTenant, getRepositories]);

	useEffect(() => {
		if (!loadingIntegrationTypes && integrationTypes.length === 0) {
			getIntegrationTypes().then((types) => {
				const allIntegrations = types.find((item: any) => item.name === 'All Integrations');
				if (allIntegrations && allIntegrations?.id) {
					getIntegrationTenant('Github');
				}
			});
		}
	}, [loadingIntegrationTypes, integrationTypes, getIntegrationTypes, getIntegrationTenant]);

	const handleSelectRepo = useCallback(
		(value: string) => {
			const projectId = getActiveProjectIdCookie();

			if (projectId) {
				setSelectedRepo(value);

				const repo = integrationGithubRepositories?.repositories.find((item) => item.id === +value);
				console.log(repo);


				editOrganizationProjectSetting(projectId, {
					repository: {
						repositoryId: repo?.id,
						name: repo?.name,
						fullName: repo?.full_name,
						owner: repo?.owner.login,
						integrationId: integrationTenant[0].id,
						...(activeTeam?.projects && activeTeam?.projects?.length ? {
							...activeTeam?.projects[0].repository || {}
						}:{})

					},
					isTasksAutoSync: true,
					isTasksAutoSyncOnLabel: true,
					tenantId: activeTeam?.tenantId,
					organizationId: activeTeam?.organizationId
				});
			}
		},
		[activeTeam, editOrganizationProjectSetting, integrationGithubRepositories, integrationTenant]
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
				editOrganizationProject(projectId, {
					syncTag: e.target.value
				});
			}
		},
		[editOrganizationProject]
	);

	return (
		<div className="flex flex-col">
			<div className="flex justify-between items-center mt-8">
				<div className="flex items-center w-full gap-5">
					<div className="border-2 border-black p-0.5 rounded-lg bg-black dark:bg-white">
						<GitHubLogoIcon width={40} height={40} className="text-white dark:text-black" />
					</div>

					<div className="flex flex-col ">
						<div className="font-medium text-black dark:text-light--theme-light">{trans.GITHUB}</div>
						{integrationGithubRepositories?.total_count === 0 && (
							<div className="text-black dark:text-light--theme-light">
								{trans.GITHUB_INTEGRATION_DESCRIPTION}
							</div>
						)}
					</div>
				</div>
				<div className="flex flex-row items-center gap-3">
					{integrationGithubRepositories?.total_count && integrationGithubRepositories.total_count > 0 && (
						<div className="flex flex-col">
							<div className="flex flex-row">
								<Select value={selectedRepo || undefined} onValueChange={handleSelectRepo}>
									<SelectTrigger className="w-80 overflow-hidden text-ellipsis whitespace-nowrap h-full border-[#00000014] dark:border-[#7B8089] dark:bg-dark--theme-light dark:text-white focus:ring-0">
										<SelectValue
											placeholder={trans.SELECT_REPOSITORY}
											className="dark:bg-dark--theme-light"
										/>
									</SelectTrigger>
									<SelectContent className="w-80">
										{integrationGithubRepositories?.repositories?.map((item) => (
											<SelectItem
												key={item.id}
												value={`${item.id}`}
												className=" dark:bg-dark--theme-light focus:ring-0"
											>
												{item.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								{selectedRepo && (
									<Button variant="ghost" className="min-w-0" onClick={handleRemoveRepo}>
										<TrashIcon />
									</Button>
								)}
							</div>
							<div className="flex flex-row items-center gap-2">
								<Switch
									checked={isTasksAutoSync}
									onChange={() => {
										handleEditOrganizationProject({
											autoSync: !isTasksAutoSync
										});
										setIsTasksAutoSync(!isTasksAutoSync);
									}}
									className={`${isTasksAutoSync ? 'bg-[#DBD3FA]' : 'bg-[#80808061]'}
          relative inline-flex h-[38px] w-[74px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
								>
									<span className="sr-only">Use setting</span>
									<span
										aria-hidden="true"
										className={`${
											isTasksAutoSync ? 'translate-x-9 bg-[#3826A6]' : 'bg-white translate-x-1'
										}
            pointer-events-none inline-block h-[30px] w-[30px] mt-[2.5px] transform rounded-full bg-[#3826A6] shadow-lg ring-0 transition duration-200 ease-in-out`}
									/>
								</Switch>
								<Text className="text-gray-400 ">Auto Sync Tasks</Text>

								<Switch
									checked={isTasksAutoSyncOnLabel}
									onChange={() => {
										handleEditOrganizationProject({
											autoSyncOnLabel: !isTasksAutoSyncOnLabel
										});
										setIsTasksAutoSyncOnLabel(!isTasksAutoSyncOnLabel);
									}}
									className={`${isTasksAutoSyncOnLabel ? 'bg-[#DBD3FA]' : 'bg-[#80808061]'}
          relative inline-flex h-[38px] w-[74px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
								>
									<span className="sr-only">Use setting</span>
									<span
										aria-hidden="true"
										className={`${
											isTasksAutoSyncOnLabel
												? 'translate-x-9 bg-[#3826A6]'
												: 'bg-white translate-x-1'
										}
            pointer-events-none inline-block h-[30px] w-[30px] mt-[2.5px] transform rounded-full bg-[#3826A6] shadow-lg ring-0 transition duration-200 ease-in-out`}
									/>
								</Switch>
								<Text className="text-gray-400 ">Auto-sync Tasks On Label</Text>
							</div>
							<div className="flex flex-row items-center gap-2">
								<InputField onChange={debounce(handleEditSyncTag, 1000)} defaultValue={syncTag} />
							</div>
						</div>
					)}

					{(!integrationGithubRepositories || integrationGithubRepositories?.total_count === 0) && (
						<Link
							href={url}
							className="min-w-0 w-24 bg-primary dark:bg-primary-light text-white text-sm flex flex-row items-center justify-center py-3 px-4 gap-3 rounded-md"
						>
							{trans.INSTALL}
						</Link>
					)}
				</div>
			</div>
		</div>
	);
};
