import { withAuthentication } from 'lib/app/authenticator';
import { MainLayout } from 'lib/layout';
import { Breadcrumb, Card, Container, Text } from 'lib/components';

import {
	LeftSideSettingMenu,
	TeamAvatar,
	TeamSettingForm,
	TaskStatusesForm,
	TaskPrioritiesForm,
	TaskSizesForm,
	DangerZoneTeam,
	TaskLabelForm,
	IssueTypesForm,
} from 'lib/settings';
import SettingsTeamSkeleton from '@components/shared/skeleton/SettingsTeamSkeleton';

import { useTranslation } from 'lib/i18n';
import { useRecoilState } from 'recoil';
import { userState } from '@app/stores';
import { useIsMemberManager, useOrganizationTeams } from '@app/hooks';
import NoTeam from '@components/pages/main/no-team';
import Link from 'next/link';
import { ArrowLeft } from 'lib/components/svgs';

const Team = () => {
	const { trans, translations } = useTranslation('settingsTeam');
	const [user] = useRecoilState(userState);
	const { isTeamMember } = useOrganizationTeams();
	const { isTeamManager } = useIsMemberManager(user);

	return (
		<>
			{!user ? (
				<SettingsTeamSkeleton />
			) : (
				<MainLayout className="items-start">
					<div className="bg-white dark:bg-dark--theme pt-16 -mt-8 pb-4">
						<Container>
							<div className="flex items-center space-x-5">
								<Link href="/">
									<ArrowLeft />
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
									<Card
										className="dark:bg-dark--theme p-[32px] mt-[36px]"
										shadow="bigger"
									>
										<Text className="text-4xl font-medium mb-2 text-center sm:text-left">
											{trans.HEADING_TITLE}
										</Text>
										<Text className="text-base font-normal text-gray-400 text-center sm:text-left">
											{translations.pages.settings.HEADING_DESCRIPTION}
										</Text>
										<TeamAvatar disabled={!isTeamManager} />
										<TeamSettingForm />
									</Card>

									<Card
										className="dark:bg-dark--theme mt-[36px]  px-0 py-0 md:px-0"
										shadow="bigger"
									>
										<IssueTypesForm />
									</Card>

									<Card
										className="dark:bg-dark--theme mt-[36px]  px-0 py-0 md:px-0"
										shadow="bigger"
									>
										<TaskStatusesForm />
									</Card>
									<Card
										className="dark:bg-dark--theme mt-[36px]  px-0 py-0 md:px-0"
										shadow="bigger"
									>
										<TaskPrioritiesForm />
									</Card>
									<Card
										className="dark:bg-dark--theme mt-[36px]  px-0 py-0 md:px-0"
										shadow="bigger"
									>
										<TaskSizesForm />
									</Card>
									<Card
										className="dark:bg-dark--theme mt-[36px]  px-0 py-0 md:px-0"
										shadow="bigger"
									>
										<TaskLabelForm />
									</Card>

									{/*
								Note: DO NOT REMOVE
								Settings v2
								*/}
									{/* <Card className="dark:bg-dark--theme mt-[36px]" shadow="bigger">
									<Text className="text-4xl font-medium mb-2 h-[4.5rem]">
										{trans.NOTIFICATION_HEADING_TITLE}
									</Text>
									<NotificationSettings />
								</Card> */}
									{/* <Card className="dark:bg-dark--theme mt-[36px]" shadow="bigger">
									<Text className="text-4xl font-medium mb-2 h-[4.5rem]">
										{trans.ISSUE_HEADING_TITLE}
									</Text>
									<IssuesSettings />
								</Card> */}

									<Card
										className="dark:bg-dark--theme p-[32px] mt-[36px]"
										shadow="bigger"
									>
										<Text className="text-2xl text-[#EB6961] font-normal text-center sm:text-left">
											{translations.pages.settings.DANDER_ZONE}
										</Text>
										<DangerZoneTeam />
									</Card>
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
