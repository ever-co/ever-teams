'use client';

import { withAuthentication } from 'lib/app/authenticator';
import { Card } from 'lib/components';

import { DangerZoneTeam, TeamAvatar, TeamSettingForm } from 'lib/settings';

import { useIsMemberManager, useOrganizationTeams } from '@app/hooks';
import { userState } from '@app/stores';
import NoTeam from '@components/pages/main/no-team';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRecoilState } from 'recoil';
import { Accordian } from 'lib/components/accordian';
import { IntegrationSetting } from 'lib/settings/integration-setting';
import { InvitationSetting } from 'lib/settings/invitation-setting';
import { IssuesSettings } from 'lib/settings/issues-settings';
import { MemberSetting } from 'lib/settings/member-setting';

const Team = () => {
	const t = useTranslations();
	const [user] = useRecoilState(userState);
	const { isTeamMember, activeTeam } = useOrganizationTeams();
	const { isTeamManager } = useIsMemberManager(user);
	return (
		<div className="overflow-auto pb-16">
			{isTeamMember ? (
				<>
					<Link href={'/settings/personal'} className="w-full">
						<button className="w-full lg:hidden hover:bg-white rounded-xl border border-dark text-dark p-4 mt-2">
							Go to Personnal settings
						</button>
					</Link>
					{/* General Settings */}
					<Accordian
						title={t('pages.settingsTeam.HEADING_TITLE')}
						className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
						id="general-settings"
					>
						<div className="flex flex-col">
							<TeamAvatar disabled={!isTeamManager} bgColor={activeTeam?.color} />
							<TeamSettingForm />
						</div>
					</Accordian>

					{/* Invitations */}
					{isTeamManager ? (
						<Accordian
							title={t('pages.settingsTeam.INVITATION_HEADING_TITLE')}
							className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
							id="invitations"
						>
							<InvitationSetting />
						</Accordian>
					) : null}

					{/* Members */}
					{isTeamManager ? (
						<Accordian
							title={t('pages.settingsTeam.MEMBER_HEADING_TITLE')}
							className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
							id="member"
						>
							<MemberSetting />
						</Accordian>
					) : null}

					{isTeamManager && (
						<Accordian
							title={t('pages.settingsTeam.INTEGRATIONS')}
							className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
							id="integrations"
						>
							<IntegrationSetting />
						</Accordian>
					)}

					{/* Issues Settings */}
					<Accordian
						title={t('pages.settingsTeam.ISSUES_HEADING_TITLE')}
						className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
						id="issues-settings"
					>
						<IssuesSettings />
					</Accordian>

					{/* TODO */}
					{/* Notification Settings */}
					{/* <Accordian
						title={t('pages.settingsTeam.NOTIFICATION_HEADING_TITLE')}
						className="p-4 mt-4 dark:bg-dark--theme"
					>
						<NotificationSettings />
					</Accordian> */}

					{/* Danger Zone */}
					<Accordian
						title={t('pages.settings.DANDER_ZONE')}
						className="w-full max-w-[96vw] p-4 mt-8 dark:bg-dark--theme"
						isDanger={true}
						id="danger-zones"
					>
						<DangerZoneTeam />
					</Accordian>
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
