'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { useAuthenticateUser, useOrganizationTeams, useTeamInvitations } from '@/core/hooks';
import { fetchingTeamInvitationsState } from '@/core/stores';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAtom, useSetAtom } from 'jotai';
import { Accordian } from '@/core/components/common/accordian';
import { activeSettingTeamTab } from '@/core/stores/common/setting';
import { InteractionObserverVisible } from '@/core/components/pages/settings/interaction-observer';
import NoTeam from '@/core/components/common/no-team';
import { TeamAvatar } from '@/core/components/teams/team-avatar';
import { EverCard } from '@/core/components/common/ever-card';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import {
	TeamSettingFormSkeleton,
	InvitationSettingSkeleton,
	MemberSettingSkeleton,
	IntegrationSettingSkeleton,
	IssuesSettingsSkeleton,
	DangerZoneTeamSkeleton
} from '@/core/components/common/skeleton/settings-skeletons';

// Lazy load heavy Settings Team components
const LazyTeamSettingForm = dynamic(
	() =>
		import('@/core/components/pages/settings/team/team-setting-form').then((mod) => ({
			default: mod.TeamSettingForm
		})),
	{
		ssr: false
	}
);

//  InvitationSetting (tables with actions)
const LazyInvitationSetting = dynamic(
	() =>
		import('@/core/components/pages/settings/team/invitation-setting').then((mod) => ({
			default: mod.InvitationSetting
		})),
	{
		ssr: false
	}
);

// Priority 3: MemberSetting (member management tables)
const LazyMemberSetting = dynamic(
	() =>
		import('@/core/components/pages/settings/team/member-setting').then((mod) => ({
			default: mod.MemberSetting
		})),
	{
		ssr: false
	}
);

// IntegrationSetting (integration configurations)
const LazyIntegrationSetting = dynamic(
	() =>
		import('@/core/components/pages/settings/team/integration-setting').then((mod) => ({
			default: mod.IntegrationSetting
		})),
	{
		ssr: false
	}
);

// IssuesSettings (issue type configurations)
const LazyIssuesSettings = dynamic(
	() =>
		import('@/core/components/pages/settings/team/issues-settings').then((mod) => ({
			default: mod.IssuesSettings
		})),
	{
		ssr: false
		// Note: No loading property for accordion content (Medium article pattern)
	}
);

// DangerZoneTeam (danger actions with confirmations)
const LazyDangerZoneTeam = dynamic(
	() =>
		import('@/core/components/pages/settings/team/danger-zone-team').then((mod) => ({
			default: mod.DangerZoneTeam
		})),
	{
		ssr: false
	}
);

const Team = () => {
	const t = useTranslations();

	const setActiveTeam = useSetAtom(activeSettingTeamTab);
	const [isFetchingTeamInvitations] = useAtom(fetchingTeamInvitationsState);
	const { user, isTeamManager } = useAuthenticateUser();

	if (!user) {
		return (
			<div className="overflow-hidden pb-16">
				<div className="flex flex-col w-full sm:mr-[20px] lg:mr-0">
					<EverCard className="dark:bg-dark--theme p-[32px] mt-[36px]" shadow="bigger">
						<div className="flex justify-center items-center p-8">
							<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
							<span className="ml-3 text-gray-600 dark:text-gray-400">Loading team settings...</span>
						</div>
					</EverCard>
				</div>
			</div>
		);
	}

	const { isTeamMember, activeTeam } = useOrganizationTeams();
	const { teamInvitations } = useTeamInvitations();

	return (
		<div className="overflow-hidden pb-16">
			{isTeamMember ? (
				<>
					<Link href={'/settings/personal'} className="w-full">
						<button className="p-4 mt-2 w-full rounded-xl border lg:hidden hover:bg-white border-dark text-dark">
							{t('pages.settingsTeam.GO_TO_PERSONAL_SETTINGS')}
						</button>
					</Link>
					{/* General Settings */}
					<InteractionObserverVisible id="general-settings" setActiveSection={setActiveTeam}>
						<Accordian
							title={t('pages.settingsTeam.HEADING_TITLE')}
							className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
						>
							<div className="flex flex-col">
								<TeamAvatar disabled={!isTeamManager} bgColor={activeTeam?.color || ''} />
								{/* Use lazy loaded TeamSettingForm with Suspense */}
								<Suspense fallback={<TeamSettingFormSkeleton />}>
									<LazyTeamSettingForm />
								</Suspense>
							</div>
						</Accordian>
					</InteractionObserverVisible>

					{/* Invitations */}
					{isTeamManager && !isFetchingTeamInvitations ? (
						<InteractionObserverVisible id="invitations" setActiveSection={setActiveTeam}>
							<Accordian
								title={t('pages.settingsTeam.INVITATION_HEADING_TITLE')}
								defaultOpen={teamInvitations.length ? true : false}
								className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
							>
								{/* Use lazy loaded InvitationSetting with Suspense */}
								<Suspense fallback={<InvitationSettingSkeleton />}>
									<LazyInvitationSetting />
								</Suspense>
							</Accordian>
						</InteractionObserverVisible>
					) : null}

					{/* Members */}
					{isTeamManager ? (
						<InteractionObserverVisible id="member" setActiveSection={setActiveTeam}>
							<Accordian
								title={t('pages.settingsTeam.MEMBER_HEADING_TITLE')}
								className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
							>
								{/* Use lazy loaded MemberSetting with Suspense */}
								<Suspense fallback={<MemberSettingSkeleton />}>
									<LazyMemberSetting />
								</Suspense>
							</Accordian>
						</InteractionObserverVisible>
					) : null}

					{isTeamManager && (
						<InteractionObserverVisible id="integrations" setActiveSection={setActiveTeam}>
							<Accordian
								title={t('pages.settingsTeam.INTEGRATIONS')}
								className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
							>
								{/* Use lazy loaded IntegrationSetting with Suspense */}
								<Suspense fallback={<IntegrationSettingSkeleton />}>
									<LazyIntegrationSetting />
								</Suspense>
							</Accordian>
						</InteractionObserverVisible>
					)}

					{/* Issues Settings */}
					<InteractionObserverVisible id="issues-settings" setActiveSection={setActiveTeam}>
						<Accordian
							title={t('pages.settingsTeam.ISSUES_HEADING_TITLE')}
							className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
						>
							{/* Use lazy loaded IssuesSettings with Suspense */}
							<Suspense fallback={<IssuesSettingsSkeleton />}>
								<LazyIssuesSettings />
							</Suspense>
						</Accordian>
					</InteractionObserverVisible>

					{/* TODO */}
					{/* Notification Settings */}
					{/* <Accordian
						title={t('pages.settingsTeam.NOTIFICATION_HEADING_TITLE')}
						className="p-4 mt-4 dark:bg-dark--theme"
					>
						<NotificationSettings />
					</Accordian> */}

					{/* Danger Zone */}
					<InteractionObserverVisible id="danger-zones" setActiveSection={setActiveTeam}>
						<Accordian
							title={t('pages.settings.DANDER_ZONE')}
							className="w-full max-w-[96vw] p-4 mt-8 mb-40 dark:bg-dark--theme"
							isDanger={true}
						>
							{/* Use lazy loaded DangerZoneTeam with Suspense */}
							<Suspense fallback={<DangerZoneTeamSkeleton />}>
								<LazyDangerZoneTeam />
							</Suspense>
						</Accordian>
					</InteractionObserverVisible>
				</>
			) : (
				<div className="flex flex-col w-full sm:mr-[20px] lg:mr-0">
					<EverCard className="dark:bg-dark--theme p-[32px] mt-[36px]" shadow="bigger">
						<NoTeam className="p-5 mt-0 xs:mt-0" />
					</EverCard>
				</div>
			)}
		</div>
	);
};

export default withAuthentication(Team, {
	displayName: 'Team',
	showPageSkeleton: true
});
