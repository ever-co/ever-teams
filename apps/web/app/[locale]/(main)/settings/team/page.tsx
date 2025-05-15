'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';

import { useIsMemberManager, useOrganizationTeams, useTeamInvitations } from '@/core/hooks';
import { fetchingTeamInvitationsState, userState } from '@/core/stores';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAtom, useSetAtom } from 'jotai';
import { Accordian } from '@/core/components/common//accordian';
import { IntegrationSetting } from '@/core/components/pages/settings/team/integration-setting';
import { InvitationSetting } from '@/core/components/pages/settings/team/invitation-setting';
import { IssuesSettings } from '@/core/components/pages/settings/team/issues-settings';
import { MemberSetting } from '@/core/components/pages/settings/team/member-setting';
import { activeSettingTeamTab } from '@/core/stores/setting';
import { InteractionObserverVisible } from '@/core/components/pages/settings/interaction-observer';
import NoTeam from '@/core/components/common/no-team';
import { TeamAvatar } from '@/core/components/teams/team-avatar';
import { DangerZoneTeam } from '@/core/components/pages/settings/team/danger-zone-team';
import { TeamSettingForm } from '@/core/components/pages/settings/team/team-setting-form';
import { Card } from '@/core/components/duplicated-components/card';

const Team = () => {
	const t = useTranslations();

	const setActiveTeam = useSetAtom(activeSettingTeamTab);
	const [user] = useAtom(userState);
	const { isTeamMember, activeTeam } = useOrganizationTeams();
	const { isTeamManager } = useIsMemberManager(user);
	const { teamInvitations } = useTeamInvitations();
	const [isFetchingTeamInvitations] = useAtom(fetchingTeamInvitationsState);

	return (
		<div className="pb-16 overflow-hidden">
			{isTeamMember ? (
				<>
					<Link href={'/settings/personal'} className="w-full">
						<button className="w-full p-4 mt-2 border lg:hidden hover:bg-white rounded-xl border-dark text-dark">
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
								<TeamAvatar disabled={!isTeamManager} bgColor={activeTeam?.color} />
								<TeamSettingForm />
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
								<InvitationSetting />
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
								<MemberSetting />
							</Accordian>
						</InteractionObserverVisible>
					) : null}

					{isTeamManager && (
						<InteractionObserverVisible id="integrations" setActiveSection={setActiveTeam}>
							<Accordian
								title={t('pages.settingsTeam.INTEGRATIONS')}
								className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
							>
								<IntegrationSetting />
							</Accordian>
						</InteractionObserverVisible>
					)}

					{/* Issues Settings */}
					<InteractionObserverVisible id="issues-settings" setActiveSection={setActiveTeam}>
						<Accordian
							title={t('pages.settingsTeam.ISSUES_HEADING_TITLE')}
							className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
						>
							<IssuesSettings />
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
							<DangerZoneTeam />
						</Accordian>
					</InteractionObserverVisible>
				</>
			) : (
				<div className="flex flex-col w-full sm:mr-[20px] lg:mr-0">
					<Card className="dark:bg-dark--theme p-[32px] mt-[36px]" shadow="bigger">
						<NoTeam className="p-5 mt-0 xs:mt-0" />
					</Card>
				</div>
			)}
		</div>
	);
};

export default withAuthentication(Team, { displayName: 'Team' });
