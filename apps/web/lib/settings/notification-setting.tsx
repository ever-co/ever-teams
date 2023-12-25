import { CommonToggle, Text } from 'lib/components';
import { useTranslations } from 'next-intl';

export const NotificationSettings = () => {
	const t = useTranslations();

	return (
		<div id="notifications">
			<div>
				<Text className="flex-none flex-grow-0 text-lg md-2 w-1/5 font-medium mt-8 text-[#282048] dark:text-white">
					{t('pages.settingsTeam.SOUND')}
				</Text>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
						{t('pages.settingsTeam.GENERAL')}
					</Text>
					<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
						<div className="py-4 flex items-center gap-x-[10px]">
							<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
						</div>
					</div>
				</div>
			</div>
			<div className="mt-8">
				<Text className="flex-none  flex-grow-0 text-lg md-2 w-1/5 font-medium text-[#282048] dark:text-white">
					{t('pages.settingsTeam.EMAIL')}
				</Text>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
						{t('pages.settingsTeam.USERS')}
					</Text>
					<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
						<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
						{t('pages.settingsTeam.TASKS')}
					</Text>
					<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
						<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
						{t('pages.settingsTeam.SYSTEM')}
					</Text>
					<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
						<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
						{t('pages.settingsTeam.SECURITY')}
					</Text>
					<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
						<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
					</div>
				</div>
			</div>
			<div className="mt-8">
				<Text className="flex-none flex-grow-0 text-lg md-2 w-1/5 font-medium text-[#282048] dark:text-white">
					{t('pages.settingsTeam.INAPP')}
				</Text>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
						{t('pages.settingsTeam.USERS')}
					</Text>
					<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
						<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
						{t('pages.settingsTeam.TASKS')}
					</Text>
					<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
						<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
						{t('pages.settingsTeam.SYSTEM')}
					</Text>
					<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
						<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none flex-grow-0 w-1/5 text-lg font-normal text-gray-400 md-2">
						{t('pages.settingsTeam.SECURITY')}
					</Text>
					<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
						<CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />
					</div>
				</div>
			</div>
		</div>
	);
};
