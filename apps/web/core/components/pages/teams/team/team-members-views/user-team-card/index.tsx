'use client';
import { secondsToTime } from '@/core/lib/helpers/index';
import {
	useCollaborative,
	useTMCardTaskEdit,
	useTaskStatistics,
	useTeamMemberCard,
	useUserProfilePage
} from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import {
	activeTaskStatisticsState,
	activeTeamManagersState,
	timerSecondsState,
	userDetailAccordion as userAccordion
} from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { Container } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { TaskEstimateInfo } from './task-estimate';
import { TaskInfo } from './task-info';
import { UserInfo } from './user-info';
import { UserTeamCardMenu } from './user-team-card-menu';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { LazyUserTeamActivity } from '@/core/components/optimized-components';
import { CollapseUpIcon, ExpandIcon } from '@/core/components/svgs/expand';
import { activityTypeState } from '@/core/stores/timer/activity-type';
import { SixSquareGridIcon } from 'assets/svg';
import { ChevronDoubleDownIcon } from '@heroicons/react/20/solid';
import { AppsTab } from '@/core/components/pages/profile/apps';
import { VisitedSitesTab } from '@/core/components/pages/profile/visited-sites';
import { FilterTab } from '@/app/[locale]/(main)/profile/[memberId]/page';
import { Loader } from 'lucide-react';
import { fullWidthState } from '@/core/stores/common/full-width';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { ScreenshootTab } from '@/core/components/pages/profile/screenshots/screenshoots';
import { InputField } from '@/core/components/duplicated-components/_input';
import { LazyUserProfileTask } from '@/core/components/optimized-components';
import { EverCard } from '@/core/components/common/ever-card';
import { VerticalSeparator } from '@/core/components/duplicated-components/separator';
import { TaskTimes, TodayWorkedTime } from '@/core/components/tasks/task-times';
import { Text } from '@/core/components';
import { IOrganizationTeam } from '@/core/types/interfaces/team/organization-team';
import { TTaskStatistics } from '@/core/types/interfaces/task/task';
import { TActivityFilter } from '@/core/types/schemas';
import { cn } from '@/core/lib/helpers';
import { ITEMS_LENGTH_TO_VIRTUALIZED } from '@/core/constants/config/constants';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { UserTeamActivitySkeleton } from '@/core/components/common/skeleton/profile-component-skeletons';

type IUserTeamCard = {
	active?: boolean;
	member?: any;
	publicTeam?: boolean;
	members?: IOrganizationTeam['members'];
	draggable: boolean;
	onDragStart: () => any;
	onDragEnter: () => any;
	onDragEnd: any;
	onDragOver: (e: React.DragEvent<HTMLDivElement>) => any;
	currentExit: boolean;
} & IClassName;

// Memoized ChevronToggleButton to prevent unnecessary re-renders
const ChevronToggleButton = React.memo(
	({
		isExpanded,
		userId,
		onToggle,
		onActivityClose
	}: {
		isExpanded: boolean;
		userId?: string;
		onToggle: (value: string) => void;
		onActivityClose: () => void;
	}) => {
		const handleClick = useCallback(() => {
			onToggle(isExpanded ? '' : (userId ?? ''));
			onActivityClose();
		}, [isExpanded, userId, onToggle, onActivityClose]);

		return (
			<div onClick={handleClick} className={clsxm('absolute top-0 right-4 w-6 h-6 cursor-pointer p-[3px]')}>
				<ChevronDoubleDownIcon className={clsxm('h-4 w-4 transition-all', isExpanded && 'rotate-180')} />
			</div>
		);
	}
);

export function UserTeamCard({
	className,
	active,
	member,
	publicTeam = false,
	draggable = false,
	onDragStart = () => null,
	onDragEnd = () => null,
	onDragEnter = () => null,
	onDragOver = () => null
}: IUserTeamCard) {
	const t = useTranslations();
	// Memoize expensive hook calls
	const profile = useUserProfilePage();
	const [userDetailAccordion, setUserDetailAccordion] = useAtom(userAccordion);
	const hook = useTaskFilter(profile);
	const memberInfo = useTeamMemberCard(member);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);
	const { collaborativeSelect, user_selected, onUserSelect } = useCollaborative(memberInfo.memberUser);
	const fullWidth = useAtomValue(fullWidthState);

	const seconds = useAtomValue(timerSecondsState);
	const setActivityFilter = useSetAtom(activityTypeState);

	const statActiveTask = useAtomValue(activeTaskStatisticsState);
	const activeTaskTotalStat = statActiveTask.total;
	const { addSeconds } = useTaskStatistics(seconds);
	const [showActivity, setShowActivity] = React.useState<boolean>(false);
	const activeTeamManagers = useAtomValue(activeTeamManagersState);
	const { data: user } = useUserQuery();

	const isManagerConnectedUser = activeTeamManagers.findIndex((member) => member.employee?.user?.id === user?.id);

	// Memoize callback to prevent unnecessary re-renders
	const showActivityFilter = useCallback(
		(type: 'DATE' | 'TICKET', member: any | null) => {
			setShowActivity((prev) => !prev);
			setUserDetailAccordion('');
			setActivityFilter((prev: TActivityFilter) => ({
				...prev,
				type,
				member
			}));
		},
		[setUserDetailAccordion, setActivityFilter]
	);

	let totalWork = <></>;
	if (memberInfo.isAuthUser) {
		const { hours: h, minutes: m } = secondsToTime(
			((member?.totalTodayTasks &&
				member?.totalTodayTasks.reduce(
					(previousValue: number, currentValue: TTaskStatistics) =>
						previousValue + (currentValue.duration || 0),
					0
				)) ||
				activeTaskTotalStat?.duration ||
				0) + addSeconds
		);

		totalWork = (
			<div className={clsxm('flex flex-col gap-1 items-center mr-4 font-normal')}>
				<span className="text-xs text-gray-500">{t('common.TOTAL_TIME')}:</span>
				<Text className="text-xs">
					{h}h : {m}m
				</Text>
			</div>
		);
	}

	const menu = (
		<>
			{(!collaborativeSelect || active) && <UserTeamCardMenu memberInfo={memberInfo} edition={taskEdition} />}

			{collaborativeSelect && !active && (
				<InputField
					type="checkbox"
					checked={user_selected()}
					className={clsxm('mr-1 w-4 h-4 border-none accent-primary-light', 'border-2 border-primary-light')}
					noWrapper={true}
					onChange={onUserSelect}
				/>
			)}
		</>
	);
	const [activityFilter, setActivity] = useState<FilterTab>('Tasks');

	const activityScreens = useMemo(
		() => ({
			Tasks: (
				<LazyUserProfileTask
					profile={profile}
					tabFiltered={hook}
					user={member?.employee?.user}
					paginateTasks={true}
					useVirtualization={hook.tasksFiltered?.length > ITEMS_LENGTH_TO_VIRTUALIZED} // Only virtualize for large lists
				/>
			),
			Screenshots: <ScreenshootTab />,
			Apps: <AppsTab />,
			'Visited Sites': <VisitedSitesTab />
		}),
		[profile, hook, member?.employee?.user]
	);
	const changeActivityFilter = useCallback(
		(filter: FilterTab) => {
			setActivity(filter);
		},
		[setActivity]
	);
	const canSeeActivity = useMemo(
		() => profile?.userProfile?.id === user?.id || isManagerConnectedUser !== -1,
		[profile?.userProfile?.id, user?.id, isManagerConnectedUser]
	);
	const isUserDetailAccordion = useMemo(
		() => userDetailAccordion == memberInfo.memberUser?.id,
		[userDetailAccordion, memberInfo.memberUser?.id]
	);
	const handleActivityClose = useCallback(() => setShowActivity(false), []);
	return (
		<div
			className={clsxm(!active && 'border-2 border-transparent')}
			draggable={draggable}
			onDragStart={onDragStart}
			onDragEnter={onDragEnter}
			onDragEnd={onDragEnd}
			onDragOver={onDragOver}
			ref={profile?.loadTaskStatsIObserverRef}
		>
			<EverCard
				shadow="bigger"
				className={clsxm(
					'sm:flex sm:flex-col hidden transition-all dark:bg-[#1E2025] min-h-24 !py-2.5 px-2.5 md:px-4 sm:justify-center',
					active
						? ['border-primary-light border-[0.1875rem]']
						: ['dark:border border border-transparent dark:border-[#FFFFFF14]'],

					className
				)}
			>
				<div
					className={cn(
						'flex relative items-center m-0 transition-all duration-300',
						isUserDetailAccordion && !showActivity && 'pb-3 border-b'
					)}
				>
					<div className="absolute left-0 cursor-pointer">
						<SixSquareGridIcon className="w-2  text-[#CCCCCC] dark:text-[#4F5662]" />
					</div>

					{/* Show user name, email and image */}
					<div className="relative">
						<UserInfo memberInfo={memberInfo} className="min-w-64 max-w-72" publicTeam={publicTeam} />
						{!publicTeam && (
							<ChevronToggleButton
								isExpanded={isUserDetailAccordion}
								userId={memberInfo.memberUser?.id}
								onToggle={setUserDetailAccordion}
								onActivityClose={handleActivityClose}
							/>
						)}
					</div>
					<VerticalSeparator />

					{/* Task information */}
					<div className="flex justify-between items-start flex-1 md:min-w-[25%] xl:min-w-[30%] !max-w-[250px]">
						<TaskInfo
							edition={taskEdition}
							memberInfo={memberInfo}
							className="flex-1 px-2 overflow-y-hidden lg:px-4"
							publicTeam={publicTeam}
							tab="default"
						/>

						{isManagerConnectedUser !== 1 ? (
							<p
								className="relative flex items-center justify-center flex-none w-8 h-8 text-center border rounded cursor-pointer -left-1 dark:border-gray-800 shrink-0"
								onClick={() => {
									showActivityFilter('TICKET', memberInfo.member ?? null);
									setUserDetailAccordion('');
								}}
							>
								{!showActivity ? (
									<ExpandIcon height={24} width={24} />
								) : (
									<CollapseUpIcon className="flex-none shrink-0" height={24} width={24} />
								)}
							</p>
						) : null}
					</div>
					<VerticalSeparator className="ml-2" />

					{/* TaskTimes */}
					<TaskTimes
						activeAuthTask={true}
						memberInfo={memberInfo}
						task={memberInfo.memberTask}
						isAuthUser={memberInfo.isAuthUser}
						className="2xl:w-48 3xl:w-[12rem] w-1/5 lg:px-4 px-2 flex flex-col gap-y-[1.125rem] justify-center"
					/>
					<VerticalSeparator />

					{/* TaskEstimateInfo */}
					<TaskEstimateInfo
						memberInfo={memberInfo}
						edition={taskEdition}
						activeAuthTask={true}
						className="min-w-52 2xl:w-52 3xl:w-64 max-w-64"
					/>

					<VerticalSeparator />

					{/* TodayWorkedTime */}
					<div className="flex justify-center items-center cursor-pointer w-1/5 gap-4 lg:px-3 2xl:w-52 max-w-[13rem]">
						<TodayWorkedTime isAuthUser={memberInfo.isAuthUser} className="" memberInfo={memberInfo} />
						{isManagerConnectedUser !== -1 ? (
							<p
								onClick={() => showActivityFilter('DATE', memberInfo.member ?? null)}
								className="flex items-center justify-center w-8 h-8 text-center border rounded cursor-pointer dark:border-gray-800"
							>
								{!showActivity ? (
									<ExpandIcon height={24} width={24} />
								) : (
									<CollapseUpIcon height={24} width={24} />
								)}
							</p>
						) : null}
					</div>
					{/* EverCard menu */}
					<div className="absolute right-2">{menu}</div>
				</div>
				{isUserDetailAccordion && memberInfo.memberUser.id == profile?.userProfile?.id && !showActivity ? (
					<div className="overflow-y-auto h-96">
						{canSeeActivity && (
							<Container fullWidth={fullWidth} className="px-3 py-5">
								<div className={clsxm('flex gap-4 justify-start items-center mt-3')}>
									{Object.keys(activityScreens).map((filter, i) => (
										<div key={i} className="flex items-center justify-start gap-4 cursor-pointer">
											{i !== 0 && <VerticalSeparator />}
											<div
												className={clsxm(
													'text-gray-500',
													activityFilter == filter && 'text-black dark:text-white'
												)}
												onClick={() => changeActivityFilter(filter as FilterTab)}
											>
												{filter}
											</div>
										</div>
									))}
								</div>
							</Container>
						)}
						{activityScreens[activityFilter] ?? null}
					</div>
				) : isUserDetailAccordion ? (
					<div className="flex items-center justify-center w-full h-20">
						<Loader className="animate-spin" />
					</div>
				) : null}
				{showActivity && (
					<Suspense fallback={<UserTeamActivitySkeleton />}>
						<LazyUserTeamActivity showActivity={showActivity} member={member} />
					</Suspense>
				)}
			</EverCard>
			<EverCard
				shadow="bigger"
				className={clsxm(
					'relative flex py-3 sm:hidden flex-col',
					active && ['border-primary-light border-[2px]'],
					className
				)}
			>
				<div className="flex items-center justify-between mb-4">
					<UserInfo memberInfo={memberInfo} publicTeam={publicTeam} className="w-9/12" />
					{totalWork}
				</div>

				<div className="flex flex-wrap items-start justify-between pb-4 border-b">
					<TaskInfo
						edition={taskEdition}
						memberInfo={memberInfo}
						className="px-4"
						publicTeam={publicTeam}
						tab="default"
					/>
				</div>

				<div className="flex justify-between mt-4 mb-4 space-x-5">
					<div className="flex space-x-4">
						<TaskTimes
							activeAuthTask={true}
							memberInfo={memberInfo}
							task={memberInfo.memberTask}
							isAuthUser={memberInfo.isAuthUser}
						/>
					</div>

					<TaskEstimateInfo memberInfo={memberInfo} edition={taskEdition} activeAuthTask={true} />
				</div>

				{/* EverCard menu */}
				<div className="absolute right-2">{menu}</div>
			</EverCard>
			{/* {currentExit && (
				<HorizontalSeparator className="mt-2 !border-primary-light dark:!border-primary-light !border-t-2" />
			)} */}
		</div>
	);
}
