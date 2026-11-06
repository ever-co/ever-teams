import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useEverPlatformSection } from '@/core/hooks/ever-platform/use-ever-platform-section';
import { SettingsRowSkeleton, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { LeftSideSettingMenuSkeleton } from '../common/skeleton/settings-page-skeleton';
import {
	PersonalDangerZoneBodySkeleton,
	PersonalSettingFormRowsSkeleton,
	ProfileAvatarSkeleton,
	SyncZoneBodySkeleton,
	WorkingHoursBodySkeleton
} from '../common/skeleton/settings-personal-skeleton';
import {
	DangerZoneTeamSkeleton,
	IntegrationSettingSkeleton,
	InvitationSettingSkeleton,
	IssuesSettingsSkeleton,
	MemberSettingSkeleton,
	TeamSettingFormSkeleton
} from '../common/skeleton/settings-skeletons';

// Personal Settings Components
export const LazyPersonalSettingForm = dynamic(
	() =>
		import('@/core/components/pages/settings/personal/personal-setting-form').then((mod) => ({
			default: mod.PersonalSettingForm
		})),
	{
		ssr: false,
		loading: () => <PersonalSettingFormRowsSkeleton />
	}
);

export const LazyWorkingHours = dynamic(
	() =>
		import('@/core/components/pages/settings/personal/working-hours').then((mod) => ({
			default: mod.WorkingHours
		})),
	{
		ssr: false,
		loading: () => <WorkingHoursBodySkeleton />
	}
);

export const LazySyncZone = dynamic(
	() => import('@/core/components/pages/settings/personal/sync.zone').then((mod) => ({ default: mod.SyncZone })),
	{
		ssr: false,
		loading: () => <SyncZoneBodySkeleton />
	}
);

// Settings Layout Components
export const LazyLeftSideSettingMenu = dynamic(
	() =>
		import('@/core/components/pages/settings/left-side-setting-menu').then((mod) => ({
			default: mod.LeftSideSettingMenu
		})),
	{
		ssr: false,
		loading: () => <LeftSideSettingMenuSkeleton />
	}
);

// Personal Settings Additional Components
export const LazyDangerZone = dynamic(
	() =>
		import('@/core/components/pages/settings/personal/danger-zone-personal').then((mod) => ({
			default: mod.DangerZone
		})),
	{
		ssr: false,
		loading: () => <PersonalDangerZoneBodySkeleton />
	}
);

export const LazyProfileAvatar = dynamic(
	() => import('@/core/components/users/profile-avatar').then((mod) => ({ default: mod.ProfileAvatar })),
	{
		ssr: false,
		loading: () => <ProfileAvatarSkeleton />
	}
);

// Team Settings Components
export const LazyTeamSettingForm = dynamic(
	() =>
		import('@/core/components/pages/settings/team/team-setting-form').then((mod) => ({
			default: mod.TeamSettingForm
		})),
	{
		ssr: false,
		loading: () => <TeamSettingFormSkeleton />
	}
);

export const LazyInvitationSetting = dynamic(
	() =>
		import('@/core/components/pages/settings/team/invitation-setting').then((mod) => ({
			default: mod.InvitationSetting
		})),
	{
		ssr: false,
		loading: () => <InvitationSettingSkeleton />
	}
);

export const LazyMemberSetting = dynamic(
	() =>
		import('@/core/components/pages/settings/team/member-setting').then((mod) => ({
			default: mod.MemberSetting
		})),
	{
		ssr: false,
		loading: () => <MemberSettingSkeleton />
	}
);

export const LazyIntegrationSetting = dynamic(
	() =>
		import('@/core/components/pages/settings/team/integration-setting').then((mod) => ({
			default: mod.IntegrationSetting
		})),
	{
		ssr: false,
		loading: () => <IntegrationSettingSkeleton />
	}
);

// Ever Platform (optional): loaded only when the section shows
/** @public Re-exported by the optimized-components barrel (index.tsx), part of its lazy settings set. */
export const LazyEverPlatformSection = dynamic(
	() =>
		import('@/core/components/pages/settings/team/ever-platform-section').then((mod) => ({
			default: mod.EverPlatformSection
		})),
	{
		ssr: false,
		loading: () => (
			<SettingsSurface>
				<SettingsRowSkeleton labelWidth="w-40" control="switch" />
			</SettingsSurface>
		)
	}
);

type EverPlatformSettingsProps = {
	isTeamManager: boolean;
	frame: (content: ReactNode) => ReactNode;
};

/**
 * The visibility rule lives here because only the lazy settings components may import the Ever Platform hooks
 * (`test/architecture/ever-platform-modules-off.test.ts`).
 */
export function EverPlatformSettings({ isTeamManager, frame }: Readonly<EverPlatformSettingsProps>) {
	const everPlatform = useEverPlatformSection(isTeamManager);
	if (!everPlatform.visible) {
		return null;
	}
	const content = (
		<LazyEverPlatformSection
			connectAvailable={everPlatform.connect.available}
			connected={everPlatform.connect.connected}
			showsDescription={false}
		/>
	);
	return <>{frame(content)}</>;
}

export const LazyIssuesSettings = dynamic(
	() =>
		import('@/core/components/pages/settings/team/issues-settings').then((mod) => ({
			default: mod.IssuesSettings
		})),
	{
		ssr: false,
		loading: () => <IssuesSettingsSkeleton />
	}
);

export const LazyDangerZoneTeam = dynamic(
	() =>
		import('@/core/components/pages/settings/team/danger-zone-team').then((mod) => ({
			default: mod.DangerZoneTeam
		})),
	{
		ssr: false,
		loading: () => <DangerZoneTeamSkeleton />
	}
);
