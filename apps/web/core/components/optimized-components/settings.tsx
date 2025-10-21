import dynamic from 'next/dynamic';

// Personal Settings Components
export const LazyPersonalSettingForm = dynamic(
	() =>
		import('@/core/components/pages/settings/personal/personal-setting-form').then((mod) => ({
			default: mod.PersonalSettingForm
		})),
	{
		ssr: false
	}
);

export const LazyWorkingHours = dynamic(
	() =>
		import('@/core/components/pages/settings/personal/working-hours').then((mod) => ({
			default: mod.WorkingHours
		})),
	{
		ssr: false
	}
);

export const LazySyncZone = dynamic(
	() => import('@/core/components/pages/settings/personal/sync.zone').then((mod) => ({ default: mod.SyncZone })),
	{
		ssr: false
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
		loading: () => (
			<div className="w-64 h-96 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg flex items-center justify-center">
				<div className="text-gray-500">Loading Settings Menu...</div>
			</div>
		)
	}
);

// Personal Settings Additional Components
export const LazyDangerZone = dynamic(
	() =>
		import('@/core/components/pages/settings/personal/danger-zone-personal').then((mod) => ({
			default: mod.DangerZone
		})),
	{
		ssr: false
	}
);

export const LazyProfileAvatar = dynamic(
	() => import('@/core/components/users/profile-avatar').then((mod) => ({ default: mod.ProfileAvatar })),
	{
		ssr: false,
		loading: () => (
			<div className="flex gap-4 items-center mb-5">
				<div className="w-20 h-20 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
				<div className="flex flex-col gap-2">
					<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-24 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>
		)
	}
);

// Team Settings Components
export const LazyTeamSettingForm = dynamic(
	() =>
		import('@/core/components/pages/settings/team/team-setting-form').then((mod) => ({
			default: mod.TeamSettingForm
		})),
	{
		ssr: false
	}
);

export const LazyInvitationSetting = dynamic(
	() =>
		import('@/core/components/pages/settings/team/invitation-setting').then((mod) => ({
			default: mod.InvitationSetting
		})),
	{
		ssr: false
	}
);

export const LazyMemberSetting = dynamic(
	() =>
		import('@/core/components/pages/settings/team/member-setting').then((mod) => ({
			default: mod.MemberSetting
		})),
	{
		ssr: false
	}
);

export const LazyIntegrationSetting = dynamic(
	() =>
		import('@/core/components/pages/settings/team/integration-setting').then((mod) => ({
			default: mod.IntegrationSetting
		})),
	{
		ssr: false
	}
);

export const LazyIssuesSettings = dynamic(
	() =>
		import('@/core/components/pages/settings/team/issues-settings').then((mod) => ({
			default: mod.IssuesSettings
		})),
	{
		ssr: false
		// Note: No loading property for accordion content (Medium article pattern)
	}
);

export const LazyDangerZoneTeam = dynamic(
	() =>
		import('@/core/components/pages/settings/team/danger-zone-team').then((mod) => ({
			default: mod.DangerZoneTeam
		})),
	{
		ssr: false
	}
);
