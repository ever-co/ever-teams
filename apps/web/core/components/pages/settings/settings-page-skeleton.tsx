'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { PageSkeletonFrame } from '@/core/components/layouts/page-skeleton';
import { LeftSideSettingMenuSkeleton } from '@/core/components/common/skeleton/settings-page-skeleton';
import {
	PersonalDangerZoneBodySkeleton,
	PersonalSettingFormRowsSkeleton,
	ProfileAvatarSkeleton,
	SyncZoneBodySkeleton,
	WorkingHoursBodySkeleton
} from '@/core/components/common/skeleton/settings-personal-skeleton';
import {
	DangerZoneTeamSkeleton,
	IssuesSettingsSkeleton,
	TeamSettingFormSkeleton
} from '@/core/components/common/skeleton/settings-skeletons';
import { SettingsFrame } from './settings-frame';
import { SETTINGS_SECTIONS_CLASS, SettingsSection } from './settings-section';
import { NotificationSettingsSkeleton } from './notification-setting';

const TEAM_SETTINGS_SEGMENT = '/settings/team';

/** The layout renders its children in a full-width column (`childrenClassName="w-full"`), narrower than the frame's. */
const LAYOUT_CONTENT_WIDTH = 'w-[calc(100%-1rem)]';

export function SettingsToolbar() {
	const t = useTranslations();
	return (
		<div className="px-4">
			<div className="flex flex-wrap items-center justify-between gap-3 py-3">
				<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
					<h1 className="truncate text-lg font-semibold">{t('common.SETTINGS')}</h1>
					<span className="text-xs text-muted-foreground">{t('pages.settings.HEADING_DESCRIPTION')}</span>
				</div>
			</div>
		</div>
	);
}

function PhoneSwitchSkeleton() {
	return <div aria-hidden="true" className="h-9 w-full animate-pulse rounded-md bg-foreground/5 lg:hidden" />;
}

export function PersonalSettingsContentSkeleton() {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-6 pb-8">
			<PhoneSwitchSkeleton />
			<div className={SETTINGS_SECTIONS_CLASS}>
				<div className="relative">
					<SettingsSection title={t('pages.settingsPersonal.HEADING_TITLE')}>
						<ProfileAvatarSkeleton />
						<PersonalSettingFormRowsSkeleton />
					</SettingsSection>
				</div>
				<div className="relative">
					<SettingsSection title={t('pages.settingsPersonal.WORKING_HOURS')}>
						<WorkingHoursBodySkeleton />
					</SettingsSection>
				</div>
				<div className="relative">
					<SettingsSection title={t('pages.settingsPersonal.DATA_SYNCHRONIZATION')}>
						<SyncZoneBodySkeleton />
					</SettingsSection>
				</div>
				<div className="relative">
					<SettingsSection title={t('pages.settingsTeam.NOTIFICATION_HEADING')}>
						<NotificationSettingsSkeleton />
					</SettingsSection>
				</div>
				<div className="relative">
					<SettingsSection title={t('pages.settings.DANDER_ZONE')} isDanger>
						<PersonalDangerZoneBodySkeleton />
					</SettingsSection>
				</div>
			</div>
		</div>
	);
}

export function TeamAvatarSkeleton() {
	return (
		<div aria-hidden="true" className="flex items-center gap-4">
			<div className="size-14 animate-pulse rounded-lg bg-foreground/5" />
		</div>
	);
}

/** Only the sections every member sees: the manager's sections depend on the role, known once the team is there. */
export function TeamSettingsContentSkeleton() {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-6 pb-8">
			<PhoneSwitchSkeleton />
			<div className={SETTINGS_SECTIONS_CLASS}>
				<div className="relative">
					<SettingsSection title={t('pages.settingsTeam.HEADING_TITLE')}>
						<div className="flex flex-col gap-6">
							<TeamAvatarSkeleton />
							<TeamSettingFormSkeleton />
						</div>
					</SettingsSection>
				</div>
				<div className="relative">
					<SettingsSection title={t('pages.settingsTeam.ISSUES_HEADING_TITLE')}>
						<IssuesSettingsSkeleton />
					</SettingsSection>
				</div>
				<div className="relative">
					<SettingsSection title={t('pages.settings.DANDER_ZONE')} isDanger>
						<DangerZoneTeamSkeleton />
					</SettingsSection>
				</div>
			</div>
		</div>
	);
}

export function SettingsContentSkeleton() {
	const pathname = usePathname();
	const currentPath = pathname ?? '';
	const isTeamSettings = currentPath.includes(TEAM_SETTINGS_SEGMENT);
	if (isTeamSettings) {
		return <TeamSettingsContentSkeleton />;
	}
	return <PersonalSettingsContentSkeleton />;
}

export function SettingsPageSkeleton() {
	return (
		<PageSkeletonFrame className="items-start" toolbar={<SettingsToolbar />}>
			<div className={LAYOUT_CONTENT_WIDTH}>
				<SettingsFrame navigation={<LeftSideSettingMenuSkeleton />}>
					<SettingsContentSkeleton />
				</SettingsFrame>
			</div>
		</PageSkeletonFrame>
	);
}
