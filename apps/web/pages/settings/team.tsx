import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Card, Container } from 'lib/components';
import { MainLayout } from 'lib/layout';

import SettingsTeamSkeleton from '@components/shared/skeleton/SettingsTeamSkeleton';
import { DangerZoneTeam, LeftSideSettingMenu, TeamAvatar, TeamSettingForm } from 'lib/settings';

import { useIsMemberManager, useOrganizationTeams } from '@app/hooks';
import { userState } from '@app/stores';
import NoTeam from '@components/pages/main/no-team';
import { ArrowLeft } from 'lib/components/svgs';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useRecoilState } from 'recoil';
// import { NotificationSettings } from 'lib/settings/notification-setting';
import { Accordian } from 'lib/components/accordian';
import { IntegrationSetting } from 'lib/settings/integration-setting';
import { InvitationSetting } from 'lib/settings/invitation-setting';
import { IssuesSettings } from 'lib/settings/issues-settings';
import { MemberSetting } from 'lib/settings/member-setting';
import { GetStaticProps, GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const Team = () => {
	const { t } = useTranslation();
	const [user] = useRecoilState(userState);
	const { isTeamMember, activeTeam } = useOrganizationTeams();
	const { isTeamManager } = useIsMemberManager(user);

	return (
		<>
			{!user ? (
				<SettingsTeamSkeleton />
			) : (
				<MainLayout className="items-start pb-1">
					<div className="pt-12 pb-4 bg-white dark:bg-dark--theme">
						<Container>
							<div className="flex items-center gap-8">
								<Link href="/">
									<ArrowLeft className="w-6 h-6" />
								</Link>

								<Breadcrumb
									paths={t('pages.settings.BREADCRUMB', { returnObjects: true })}
									className="text-sm"
								/>
							</div>
						</Container>
					</div>

					<Container className="mb-10">
						<div className="flex flex-col w-full sm:flex-row">
							<LeftSideSettingMenu />
							{isTeamMember ? (
								<div className="flex flex-col w-full sm:mr-[20px] lg:mr-0">
									{/* General Settings */}
									<Accordian
										title={t('pages.settingsTeam.HEADING_TITLE')}
										className="p-4 mt-8 dark:bg-dark--theme"
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
											className="p-4 mt-4 dark:bg-dark--theme"
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
											title={t('pages.settingsTeam.MEMBER_HEADING_TITLE')}
											className="p-4 mt-4 dark:bg-dark--theme"
											id="member"
										>
											<MemberSetting />
										</Accordian>
									) : (
										<></>
									)}

									{isTeamManager && (
										<Accordian
											title={t('pages.settingsTeam.INTEGRATIONS')}
											className="p-4 mt-4 dark:bg-dark--theme"
											id="integrations"
										>
											<IntegrationSetting />
										</Accordian>
									)}

									{/* Issues Settings */}
									<Accordian
										title={t('pages.ISSUES_HEADING_TITLE')}
										className="p-4 mt-4 dark:bg-dark--theme"
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
										className="p-4 mt-4 dark:bg-dark--theme"
										isDanger={true}
										id="danger-zones"
									>
										<DangerZoneTeam />
									</Accordian>
								</div>
							) : (
								<div className="flex flex-col w-full sm:mr-[20px] lg:mr-0">
									<Card className="dark:bg-dark--theme p-[32px] mt-[36px]" shadow="bigger">
										<NoTeam className="p-5 mt-0 xs:mt-0" />
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

export const getStaticProps: GetStaticProps = async (context: GetStaticPropsContext) => {
	const { locale } = context;
	const translationProps = await serverSideTranslations(locale ?? 'en', ['common']);
	return {
		props: {
			...translationProps
		}
	};
};
export default withAuthentication(Team, { displayName: 'Team' });
