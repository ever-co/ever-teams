import { withAuthentication } from 'lib/app/authenticator';
import { MainLayout } from 'lib/layout';
import { Breadcrumb, Card, Container } from 'lib/components';

import {
	LeftSideSettingMenu,
	TeamAvatar,
	TeamSettingForm,
	DangerZoneTeam
} from 'lib/settings';
import SettingsTeamSkeleton from '@components/shared/skeleton/SettingsTeamSkeleton';

import { useTranslation } from 'lib/i18n';
import { useRecoilState } from 'recoil';
import { userState } from '@app/stores';
import { useIsMemberManager, useOrganizationTeams } from '@app/hooks';
import NoTeam from '@components/pages/main/no-team';
import Link from 'next/link';
import { ArrowLeft } from 'lib/components/svgs';
// import { NotificationSettings } from 'lib/settings/notification-setting';
import { IssuesSettings } from 'lib/settings/issues-settings';
import { InvitationSetting } from 'lib/settings/invitation-setting';
import { MemberSetting } from 'lib/settings/member-setting';
import { Accordian } from 'lib/components/accordian';

const Team = () => {
	const { trans, translations } = useTranslation('settingsTeam');
	const [user] = useRecoilState(userState);
	const { isTeamMember, activeTeam } = useOrganizationTeams();
	const { isTeamManager } = useIsMemberManager(user);

	return (
		<>
			{!user ? (
				<SettingsTeamSkeleton />
			) : (
				<MainLayout className="items-start pb-1">
					<div className="bg-white dark:bg-dark--theme pt-12 pb-4">
						<Container>
							<div className="flex items-center gap-8">
								<Link href="/">
									<ArrowLeft className="w-6 h-6" />
								</Link>

								<Breadcrumb
									paths={translations.pages.settings.BREADCRUMB}
									className="text-sm"
								/>
							</div>
						</Container>
					</div>

					<Container className="mb-10">
						<div className="flex w-full sm:flex-row flex-col">
							<LeftSideSettingMenu />
							{isTeamMember ? (
								<div className="flex flex-col w-full sm:mr-[20px] lg:mr-0">
									{/* General Settings */}
									<Accordian
										title={trans.HEADING_TITLE}
										className="dark:bg-dark--theme p-4 mt-8"
										id="general-settings"
									>
										<div className="flex flex-col">
											<TeamAvatar
												disabled={!isTeamManager}
												bgColor={activeTeam?.color}
											/>
											<TeamSettingForm />
										</div>
									</Accordian>

									{/* Invitations */}
									{isTeamManager ? (
										<Accordian
											title={trans.INVITATION_HEADING_TITLE}
											className="dark:bg-dark--theme p-4 mt-4"
											id="invitations"
										>
											<InvitationSetting />
										</Accordian>
									) : (
										''
									)}

									{/* Members */}
									{isTeamManager ? (
										<Accordian
											title={trans.MEMBER_HEADING_TITLE}
											className="dark:bg-dark--theme p-4 mt-4"
											id="member"
										>
											<MemberSetting />
										</Accordian>
									) : (
										<></>
									)}

									{/* Issues Settings */}
									<Accordian
										title={trans.ISSUES_HEADING_TITLE}
										className="dark:bg-dark--theme p-4 mt-4"
										id="issues-settings"
									>
										<IssuesSettings />
									</Accordian>

									{/* TODO */}
									{/* Notification Settings */}
									{/* <Accordian
										title={trans.NOTIFICATION_HEADING_TITLE}
										className="dark:bg-dark--theme p-4 mt-4"
									>
										<NotificationSettings />
									</Accordian> */}

									{/* Danger Zone */}
									<Accordian
										title={translations.pages.settings.DANDER_ZONE}
										className="dark:bg-dark--theme p-4 mt-4"
										isDanger={true}
										id="danger-zones"
									>
										<DangerZoneTeam />
									</Accordian>
								</div>
							) : (
								<div className="flex flex-col w-full sm:mr-[20px] lg:mr-0">
									<Card
										className="dark:bg-dark--theme p-[32px] mt-[36px]"
										shadow="bigger"
									>
										<NoTeam className="xs:mt-0 mt-0 p-5" />
									</Card>
								</div>
							)}
						</div>
					</Container>
				</MainLayout>
			)}
		</>
	);
};

export default withAuthentication(Team, { displayName: 'Team' });
