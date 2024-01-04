'use client';

import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Card, Container } from 'lib/components';
import { MainLayout } from 'lib/layout';

import SettingsTeamSkeleton from '@components/shared/skeleton/SettingsTeamSkeleton';
import { DangerZoneTeam, LeftSideSettingMenu, TeamAvatar, TeamSettingForm } from 'lib/settings';

import { useIsMemberManager, useOrganizationTeams } from '@app/hooks';
import { userState } from '@app/stores';
import NoTeam from '@components/pages/main/no-team';
import { ArrowLeft } from 'lib/components/svgs';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Accordian } from 'lib/components/accordian';
import { IntegrationSetting } from 'lib/settings/integration-setting';
import { InvitationSetting } from 'lib/settings/invitation-setting';
import { IssuesSettings } from 'lib/settings/issues-settings';
import { MemberSetting } from 'lib/settings/member-setting';
import type { AppProps } from 'next/app';
import { MyAppProps } from '@app/interfaces/AppProps';
import { JitsuRoot } from 'lib/settings/JitsuRoot';
import { fullWidthState } from '@app/stores/fullWidth';

const Team = ({ pageProps }: AppProps<MyAppProps>) => {
	const t = useTranslations();
	const [user] = useRecoilState(userState);
	const { isTeamMember, activeTeam } = useOrganizationTeams();
	const { isTeamManager } = useIsMemberManager(user);
	const breadcrumb = [...JSON.parse(t('pages.settings.BREADCRUMB'))];
	const fullWidth = useRecoilValue(fullWidthState);
	return (
		<>
			<JitsuRoot pageProps={pageProps}>
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

									<Breadcrumb paths={breadcrumb} className="text-sm" />
								</div>
							</Container>
						</div>

						<Container fullWidth={fullWidth} className="mb-10">
							<div className="flex flex-col w-full lg:flex-row">
								<LeftSideSettingMenu />
								{isTeamMember ? (
									<div className="flex flex-col w-full sm:mr-[20px] lg:mr-0">
										<Link href={'/settings/personal'} className="w-full">
											<button className="w-full lg:hidden hover:bg-white rounded-xl border border-dark text-dark p-4 mt-2">
												Go to Personnal settings
											</button>
										</Link>
										{/* General Settings */}
										<Accordian
											title={t('pages.settingsTeam.HEADING_TITLE')}
											className="max-w-[66vw] p-4 mt-8 dark:bg-dark--theme"
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
												className="max-w-[66vw] overflow-y-auto p-4 mt-4 dark:bg-dark--theme"
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
												className="max-w-[66vw]  p-4 mt-4 dark:bg-dark--theme"
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
												className="max-w-[66vw] p-4 mt-4 dark:bg-dark--theme"
												id="integrations"
											>
												<IntegrationSetting />
											</Accordian>
										)}

										{/* Issues Settings */}
										<Accordian
											title={t('pages.settingsTeam.ISSUES_HEADING_TITLE')}
											className="max-w-[66vw] overflow-y-auto p-4 mt-4 dark:bg-dark--theme"
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
											className="max-w-[66vw] p-4 mt-4 dark:bg-dark--theme"
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
			</JitsuRoot>
		</>
	);
};

export default withAuthentication(Team, { displayName: 'Team' });
