import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { Button } from 'lib/components';
import { useTranslation } from 'lib/i18n';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/select';
import {
	useGitHubIntegration,
	useIntegrationTenant,
	useIntegrationTypes,
} from '@app/hooks';
import { useEffect, useState } from 'react';

export const IntegrationSetting = () => {
	const { trans } = useTranslation('settingsTeam');

	const { integrationGithubRepositories, getRepositories } =
		useGitHubIntegration();

	const {
		getIntegrationTenant,
		loading: integrationTenantLoading,
		integrationTenant,
	} = useIntegrationTenant();

	const {
		loading: loadingIntegrationTypes,
		integrationTypes,
		getIntegrationTypes,
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
		getIntegrationTenant,
	]);

	const [selectedRepo, setSelectedRepo] = useState<string>();

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
							<Select
								value={selectedRepo}
								onValueChange={(value) => {
									setSelectedRepo(value);
								}}
							>
								<SelectTrigger className="w-64 h-full border-[#00000014] dark:border-[#7B8089] dark:bg-dark--theme-light">
									<SelectValue
										placeholder="Select Repository"
										className=" dark:bg-dark--theme-light"
									/>
								</SelectTrigger>
								<SelectContent>
									{integrationGithubRepositories?.repositories?.map((item) => (
										<SelectItem
											key={item.id}
											value={`${item.id}`}
											className=" dark:bg-dark--theme-light"
										>
											{item.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					<Button className="min-w-0 w-24">{trans.INSTALL}</Button>
				</div>
			</div>
		</div>
	);
};
