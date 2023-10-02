import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { Button } from 'lib/components';
import { useTranslation } from 'lib/i18n';

export const IntegrationSetting = () => {
	const { trans } = useTranslation('settingsTeam');

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
						<div className="text-black dark:text-light--theme-light">
							{trans.GITHUB_INTEGRATION_DESCRIPTION}
						</div>
					</div>
				</div>
				<div>
					<Button className="min-w-0 w-24">{trans.INSTALL}</Button>
				</div>
			</div>
		</div>
	);
};
