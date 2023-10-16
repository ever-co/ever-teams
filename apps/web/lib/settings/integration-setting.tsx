import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'lib/i18n';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@components/ui/select';
import {
	useGitHubIntegration,
	useIntegrationTenant,
	useIntegrationTypes,
	useOrganizationTeams
} from '@app/hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GITHUB_APP_NAME } from '@app/constants';
import Link from 'next/link';
import { useOrganizationProjects } from '@app/hooks';
import { TrashIcon } from 'lib/components/svgs';
import { Button } from 'lib/components';

export const IntegrationSetting = () => {
	const { trans } = useTranslation('settingsTeam');

	const params = useMemo(() => {
		return {
			state: `${window.location.origin}/integration/github`
		} as { [x: string]: string };
	}, []);

	const queries = new URLSearchParams(params || {});
	const url = `https://github.com/apps/${GITHUB_APP_NAME}/installations/new?${queries.toString()}`;

	const { activeTeam } = useOrganizationTeams();

	const [selectedRepo, setSelectedRepo] = useState<string>();

	useEffect(() => {
		if (
			activeTeam?.projects &&
			activeTeam?.projects?.length &&
			activeTeam?.projects[0]?.externalRepositoryId
		) {
			setSelectedRepo(`${activeTeam?.projects[0]?.externalRepositoryId}`);
		}
	}, [activeTeam]);

	const { integrationGithubRepositories, getRepositories } =
		useGitHubIntegration();

	const { editOrganizationProjectSetting } = useOrganizationProjects();

	const {
		getIntegrationTenant,
		loading: integrationTenantLoading,
		integrationTenant
	} = useIntegrationTenant();

	const {
		loading: loadingIntegrationTypes,
		integrationTypes,
		getIntegrationTypes
	} = useIntegrationTypes();

	useEffect(() => {
		if (
			!integrationTenantLoading &&
			integrationTenant &&
			integrationTenant?.id
		) {
			getRepositories(integrationTenant.id);
		}
	}, [integrationTenantLoading, integrationTenant, getRepositories]);

	useEffect(() => {
		if (!loadingIntegrationTypes && integrationTypes.length === 0) {
			getIntegrationTypes().then((types) => {
				const allIntegrations = types.find(
					(item: any) => item.name === 'All Integrations'
				);
				if (allIntegrations && allIntegrations?.id) {
					getIntegrationTenant('Github');
				}
			});
		}
	}, [
		loadingIntegrationTypes,
		integrationTypes,
		getIntegrationTypes,
		getIntegrationTenant
	]);

	const handleSelectRepo = useCallback(
		(value: string) => {
			if (activeTeam?.projects && activeTeam?.projects?.length) {
				setSelectedRepo(value);
				editOrganizationProjectSetting(activeTeam?.projects[0].id, {
					externalRepositoryId: +value,
					isTasksAutoSync: true,
					isTasksAutoSyncOnLabel: true,
					tenantId: activeTeam?.tenantId,
					organizationId: activeTeam?.organizationId
				});
			}
		},
		[activeTeam, editOrganizationProjectSetting]
	);
	const handleRemoveRepo = useCallback(() => {
		if (activeTeam?.projects && activeTeam?.projects?.length) {
			setSelectedRepo(undefined);
			editOrganizationProjectSetting(activeTeam?.projects[0].id, {
				externalRepositoryId: null,
				isTasksAutoSync: false,
				isTasksAutoSyncOnLabel: false,
				tenantId: activeTeam?.tenantId,
				organizationId: activeTeam?.organizationId
			});
		}
	}, [activeTeam, editOrganizationProjectSetting]);

	return (
		<div className="flex flex-col">
			<div className="flex justify-between items-center mt-8">
				<div className="flex items-center w-full gap-5">
					<div className="border-2 border-black p-0.5 rounded-lg bg-black dark:bg-white">
						<GitHubLogoIcon
							width={40}
							height={40}
							className="text-white dark:text-black"
						/>
					</div>

					<div className="flex flex-col ">
						<div className="font-medium text-black dark:text-light--theme-light">
							{trans.GITHUB}
						</div>
						{integrationGithubRepositories?.total_count === 0 && (
							<div className="text-black dark:text-light--theme-light">
								{trans.GITHUB_INTEGRATION_DESCRIPTION}
							</div>
						)}
					</div>
				</div>
				<div className="flex flex-row items-center gap-3">
					{integrationGithubRepositories?.total_count &&
						integrationGithubRepositories.total_count > 0 && (
							<>
								<Select value={selectedRepo} onValueChange={handleSelectRepo}>
									<SelectTrigger className="w-80 overflow-hidden text-ellipsis whitespace-nowrap h-full border-[#00000014] dark:border-[#7B8089] dark:bg-dark--theme-light dark:text-white focus:ring-0">
										<SelectValue
											placeholder={trans.SELECT_REPOSITORY}
											className=" dark:bg-dark--theme-light"
										/>
									</SelectTrigger>
									<SelectContent className="w-80">
										{integrationGithubRepositories?.repositories?.map(
											(item) => (
												<SelectItem
													key={item.id}
													value={`${item.id}`}
													className=" dark:bg-dark--theme-light focus:ring-0"
												>
													{item.name}
												</SelectItem>
											)
										)}
									</SelectContent>
								</Select>

								{selectedRepo && (
									<Button
										variant="ghost"
										className="min-w-0"
										onClick={handleRemoveRepo}
									>
										<TrashIcon />
									</Button>
								)}
							</>
						)}

					{(!integrationGithubRepositories ||
						integrationGithubRepositories?.total_count === 0) && (
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
