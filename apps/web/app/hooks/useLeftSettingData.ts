import { useTranslation } from 'react-i18next';

export const useLeftSettingData = () => {
	const { t } = useTranslation();
	const PersonalAccordianData = [
		{
			title: t('pages.settingsTeam.GENERAL'),
			color: '#7E7991',
			href: '#general'
		},
		// {
		// 	title: t('pages.settingsPersonal.WORK_SCHEDULE'),
		// 	color: '#7E7991',
		// 	href: '#work-schedule',
		// },
		// {
		// 	title: t('pages.settingsPersonal.SUBSCRIPTION'),
		// 	color: '#7E7991',
		// 	href: '#subscription',
		// },
		{
			title: t('pages.settings.DANDER_ZONE'),
			color: '#DE5536',
			href: '#danger-zone'
		}
	];

	const TeamAccordianData = [
		{
			title: t('pages.settingsTeam.HEADING_TITLE'),
			color: '#7E7991',
			href: '#general-settings',
			managerOnly: false
		},
		{
			title: t('pages.settingsTeam.INVITATION_HEADING_TITLE'),
			color: '#7E7991',
			href: '#invitations',
			managerOnly: true
		},
		{
			title: t('pages.settingsTeam.MEMBER_HEADING_TITLE'),
			color: '#7E7991',
			href: '#member',
			managerOnly: true
		},
		{
			title: t('pages.settingsTeam.INTEGRATIONS'),
			color: '#7E7991',
			href: '#integrations',
			managerOnly: true
		},
		{
			title: t('pages.settingsTeam.ISSUES_HEADING_TITLE'),
			color: '#7E7991',
			href: '#issues-settings',
			managerOnly: false
		},
		{
			title: t('pages.settingsTeam.TASK_STATUSES'),
			color: '#7E7991',
			href: '#statuses',
			managerOnly: false
		},
		{
			title: t('pages.settingsTeam.PRIORITIES_HEADING'),
			color: '#7E7991',
			href: '#priorities',
			managerOnly: false
		},
		{
			title: t('pages.settingsTeam.SIZES_HEADING'),
			color: '#7E7991',
			href: '#sizes',
			managerOnly: false
		},
		{
			title: t('common.LABELS'),
			color: '#7E7991',
			href: '#labels',
			managerOnly: false
		},
		{
			title: t('pages.settingsTeam.RELATED_ISSUE_TYPE'),
			color: '#7E7991',
			href: '#related-issue-types',
			managerOnly: true
		},
		// {
		// 	title: t('pages.settingsTeam.NOTIFICATION_HEADING'),
		// 	color: '#7E7991',
		// 	href: '#notifications',
		// 	managerOnly: true,
		// },
		// {
		// 	title: t('pages.settingsTeam.INTEGRATIONS'),
		// 	color: '#7E7991',
		// 	href: '#integrations',
		// 	managerOnly: true,
		// },
		{
			title: t('pages.settingsTeam.DANDER_ZONES'),
			color: '#DE5536',
			href: '#danger-zones'
		}
	];
	return { PersonalAccordianData, TeamAccordianData };
};
