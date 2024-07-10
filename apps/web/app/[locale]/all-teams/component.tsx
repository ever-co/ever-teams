'use client';

import { useRouter } from 'next/navigation';
import { useRecoilValue } from 'recoil';
import { fullWidthState } from '@app/stores/fullWidth';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Card, Container, HorizontalSeparator, VerticalSeparator } from 'lib/components';
import { MainHeader, MainLayout } from 'lib/layout';
import { useOrganizationAndTeamManagers } from '@app/hooks/features/useOrganizationTeamManagers';
import { useEffect, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem } from '@components/ui/accordion';
import { IOrganizationTeamList, ITeamTask, OT_Member } from '@app/interfaces';
import { AccordionTrigger } from '@radix-ui/react-accordion';
import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@app/hooks';
import { Transition } from '@headlessui/react';
import { MinusCircledIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import TeamMemberHeader from 'lib/features/team-member-header';
import { IssuesView } from '@app/constants';
import { clsxm } from '@app/utils';
import { SixSquareGridIcon } from 'assets/svg';
import { UserInfo } from 'lib/features/team/user-team-card/user-info';
import { TaskInfo } from 'lib/features/team/user-team-card/task-info';
import { TaskTimes, TodayWorkedTime } from 'lib/features';
import { TaskEstimateInfo } from 'lib/features/team/user-team-card/task-estimate';
import { UserTeamCardMenu } from 'lib/features/team/user-team-card/user-team-card-menu';

function AllTeamsPage() {
	const t = useTranslations();
	const fullWidth = useRecoilValue(fullWidthState);
	const { userManagedTeams } = useOrganizationAndTeamManagers();

	const breadcrumb = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: t('common.ALL_TEAMS'), href: '/all-teams' }
	];

	/* If the user is not a manager in any team or if he's
        manager in only one team, then redirect him to the home page
    */
	if (userManagedTeams.length < 2) return <RedirectUser />;

	return (
		<MainLayout className="items-start">
			<MainHeader fullWidth={fullWidth} className={'pb-2 pt-10 sticky top-20 z-50'}>
				{/* Breadcrumb */}
				<div className="flex items-center gap-8 mb-5">
					<Breadcrumb paths={breadcrumb} className="text-sm" />
				</div>
				<TeamMemberHeader view={IssuesView.CARDS} />
			</MainHeader>
			<Container fullWidth={fullWidth} className="flex py-10 pt-20">
				<AllTeamsMember teams={userManagedTeams} />
			</Container>
		</MainLayout>
	);
}

function AllTeamsMember({ teams }: { teams: IOrganizationTeamList[] }) {
	return (
		<div className="flex flex-col gap-5 w-full">
			<Accordion type="multiple" className="text-sm flex flex-col gap-5">
				{teams.map((team) => {
					return (
						<AccordionItem key={team.id} value={team.name} className="dark:border-slate-600 !border-none">
							<AccordionTrigger className="!min-w-full text-start">
								<div className="flex items-center justify-between gap-3">
									<span className="font-medium min-w-max">
										{team.name} ({team.members.length})
									</span>
									<HorizontalSeparator />
									<MinusCircledIcon />
								</div>
							</AccordionTrigger>

							<AccordionContent className="bg-light--theme border-none dark:bg-dark--theme flex flex-col gap-2 mt-4">
								{team.members.map((member) => {
									return (
										<Transition
											key={`${member.id}${team.id}`}
											show={true}
											enter="transition-opacity duration-75"
											enterFrom="opacity-0"
											enterTo="opacity-100"
											leave="transition-opacity duration-150"
											leaveFrom="opacity-100"
											leaveTo="opacity-0"
										>
											<Card
												shadow="bigger"
												className={clsxm(
													'sm:block hidden transition-all dark:bg-[#1E2025] min-h-[7rem] !py-4',
													'dark:border border border-transparent dark:border-[#FFFFFF14]'
												)}
											>
												<div className="flex m-0 relative items-center">
													<div className="absolute left-0 cursor-pointer">
														<SixSquareGridIcon className="w-2  text-[#CCCCCC] dark:text-[#4F5662]" />
													</div>
													{/* User informations */}
													<div className="relative">
														<MemberInfo member={member} />
													</div>

													<VerticalSeparator />

													{/* Task informations */}
													<div className="flex justify-between items-center flex-1 min-w-[40%]">
														<UserTeamActiveTaskInfo member={member} />
													</div>

													<VerticalSeparator className="ml-2" />

													{/* Task worked Times */}
													<UserTeamActiveTaskTimes member={member} />

													<VerticalSeparator />

													{/* Task estimate Info */}
													<UserTeamActiveTaskEstimate member={member} />

													<VerticalSeparator />

													<UserTeamActiveTaskTodayWorked member={member} />

													{/* Card Menu */}
													<div className="absolute hidden right-2">
														<UserActiveTaskMenu member={member} />
													</div>
												</div>
											</Card>
										</Transition>
									);
								})}
							</AccordionContent>
						</AccordionItem>
					);
				})}
			</Accordion>
		</div>
	);
}

function MemberInfo({ member }: { member: OT_Member }) {
	const memberInfo = useTeamMemberCard(member);
	return <UserInfo memberInfo={memberInfo} className="2xl:w-[20.625rem] w-1/4" publicTeam={false} />;
}

function UserTeamActiveTaskInfo({ member }: { member: OT_Member }) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<ITeamTask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTeamTasks();

	useEffect(() => {
		getTaskById(member.activeTaskId || '')
			.then((response) => setActiveTask(response.data))
			.catch((_) => console.log(_));

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<>
			{activeTask ? (
				<TaskInfo
					edition={{ ...taskEdition, task: activeTask }}
					memberInfo={memberInfo}
					className="flex-1 lg:px-4 px-2 overflow-y-hidden"
					publicTeam={false}
				/>
			) : (
				<div className="w-full  justify-center text-center self-center">--</div>
			)}
		</>
	);
}

function UserTeamActiveTaskTimes({ member }: { member: OT_Member }) {
	const memberInfo = useTeamMemberCard(member);

	const { getTaskById } = useTeamTasks();

	const [activeTask, setActiveTask] = useState<ITeamTask | null | undefined>(null);

	useEffect(() => {
		getTaskById(member.activeTaskId || '')
			.then((response) => setActiveTask(response.data))
			.catch((_) => console.log(_));

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<TaskTimes
			activeAuthTask={true}
			memberInfo={memberInfo}
			task={activeTask}
			isAuthUser={memberInfo.isAuthUser}
			className="2xl:w-48 3xl:w-[12rem] w-1/5 lg:px-4 px-2 flex flex-col gap-y-[1.125rem] justify-center"
		/>
	);
}

function UserTeamActiveTaskEstimate({ member }: { member: OT_Member }) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<ITeamTask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTeamTasks();

	useEffect(() => {
		getTaskById(member.activeTaskId || '')
			.then((response) => setActiveTask(response.data))
			.catch((_) => console.log(_));

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<TaskEstimateInfo
			memberInfo={memberInfo}
			edition={taskEdition}
			activeAuthTask={true}
			className="w-1/5 lg:px-3 2xl:w-52 3xl:w-64"
		/>
	);
}

function UserTeamActiveTaskTodayWorked({ member }: { member: OT_Member }) {
	const memberInfo = useTeamMemberCard(member);
	return (
		<div className="flex justify-center items-center cursor-pointer w-1/5 gap-4 lg:px-3 2xl:w-52 max-w-[13rem]">
			<TodayWorkedTime isAuthUser={memberInfo.isAuthUser} className="" memberInfo={memberInfo} />
		</div>
	);
}

function UserActiveTaskMenu({ member }: { member: OT_Member }) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<ITeamTask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTeamTasks();

	useEffect(() => {
		getTaskById(member.activeTaskId || '')
			.then((response) => setActiveTask(response.data))
			.catch((_) => console.log(_));

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	return (
		<>
			<UserTeamCardMenu memberInfo={memberInfo} edition={taskEdition} />
		</>
	);
}

function RedirectUser() {
	const router = useRouter();
	useEffect(() => {
		router.push('/');
	}, [router]);
	return <></>;
}

export default withAuthentication(AllTeamsPage, { displayName: 'AllManagedTeams' });
