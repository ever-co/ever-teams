import { CommonToggle, Text } from '@/core/components';
import { useTranslations } from 'next-intl';

/** Settings row: label column, control column (see settings-design-contract). */
const ROW = 'grid w-full grid-cols-1 gap-2 border-t border-border py-3 first:border-t-0 first:pt-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4';

export const NotificationSettings = () => {
	const t = useTranslations();

	const toggle = <CommonToggle enabledText={t('common.ACTIVATED')} disabledText={t('common.DEACTIVATED')} />;

	const groups: { title: string; rows: string[] }[] = [
		{ title: t('pages.settingsTeam.SOUND'), rows: [t('pages.settingsTeam.GENERAL')] },
		{
			title: t('pages.settingsTeam.EMAIL'),
			rows: [
				t('pages.settingsTeam.USERS'),
				t('pages.settingsTeam.TASKS'),
				t('pages.settingsTeam.SYSTEM'),
				t('pages.settingsTeam.SECURITY')
			]
		},
		{
			title: t('pages.settingsTeam.INAPP'),
			rows: [
				t('pages.settingsTeam.USERS'),
				t('pages.settingsTeam.TASKS'),
				t('pages.settingsTeam.SYSTEM'),
				t('pages.settingsTeam.SECURITY')
			]
		}
	];

	return (
		<div id="notifications" className="flex w-full flex-col gap-4">
			{groups.map((group) => (
				<div key={group.title}>
					<Text className="pb-1 text-sm font-semibold text-foreground">{group.title}</Text>
					<div>
						{group.rows.map((label) => (
							<div key={`${group.title}-${label}`} className={ROW}>
								<Text className="text-sm font-medium text-muted-foreground">{label}</Text>
								<div className="flex items-center">{toggle}</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
};
