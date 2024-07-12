'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import { imgTitle } from '@app/helpers';
import { useAuthenticateUser, useDailyPlan, useOrganizationTeams, useTimer, useUserProfilePage } from '@app/hooks';
import { ITimerStatusEnum, OT_Member } from '@app/interfaces';
import { clsxm, isValidUrl } from '@app/utils';
import clsx from 'clsx';
import { withAuthentication } from 'lib/app/authenticator';
import { Avatar, Breadcrumb, Button, Container, Text, VerticalSeparator } from 'lib/components';
import { ArrowLeftIcon } from 'assets/svg';
import { TaskFilter, Timer, TimerStatus, UserProfileTask, getTimerStatusValue, useTaskFilter } from 'lib/features';
import { MainHeader, MainLayout } from 'lib/layout';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useModal, useTeamTasks } from '@app/hooks';
import { Modal, Divider } from 'lib/components';
import stc from 'string-to-color';
import { MdOutlineMoreTime } from "react-icons/md";
import { IoIosTimer } from "react-icons/io";
import { FiLoader } from "react-icons/fi";

import { useRecoilValue, useSetRecoilState } from 'recoil';
import { fullWidthState } from '@app/stores/fullWidth';
import { ScreenshootTab } from 'lib/features/activity/screenshoots';
import { AppsTab } from 'lib/features/activity/apps';
import { VisitedSitesTab } from 'lib/features/activity/visited-sites';
import { activityTypeState } from '@app/stores/activity-type';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@components/ui/resizable';
import api from '@app/services/client/axios';

export type FilterTab = 'Tasks' | 'Screenshots' | 'Apps' | 'Visited Sites';

const Profile = React.memo(function ProfilePage({ params }: { params: { memberId: string } }) {
	const profile = useUserProfilePage();

	const { user } = useAuthenticateUser();
	const { isTrackingEnabled, activeTeam, activeTeamManagers } = useOrganizationTeams();
	const members = activeTeam?.members;
	const { getEmployeeDayPlans } = useDailyPlan();
	const fullWidth = useRecoilValue(fullWidthState);
	const [activityFilter, setActivityFilter] = useState<FilterTab>('Tasks');
	const setActivityTypeFilter = useSetRecoilState(activityTypeState);
	const hook = useTaskFilter(profile);
	const { tasks } = useTeamTasks();

	const [date, setDate] = useState<string>('');
	const [isBillable, setIsBillable] = useState<boolean>(false);
	const [startTime, setStartTime] = useState<string>('');
	const [endTime, setEndTime] = useState<string>('');
	const [team, setTeam] = useState<string>('');
	const [task, setTask] = useState<string>('');
	const [description, setDescription] = useState<string>('');
	const [reason, setReason] = useState<string>('');
	const [timeDifference, setTimeDifference] = useState<string>('');
	const [minStartTime, setMinStartTime] = useState<string>('');
	const [errorMsg, setError] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(false);

	const { isOpen, openModal, closeModal } = useModal();

	React.useEffect(() => {
		const now = new Date();
		const currentDate = now.toISOString().slice(0, 10);
		const currentTime = now.toTimeString().slice(0, 5);
		setMinStartTime(currentTime);

		setDate(currentDate);
		setStartTime(currentTime);
		setEndTime(currentTime);
	}, []);


	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const timeObject = {
			date,
			isBillable,
			startTime,
			endTime,
			team,
			task,
			description,
			reason,
			timeDifference
		};

		if (date && startTime && endTime && team && task) {
			setLoading(true);
			setError('');
			const postData = async () => {
				try {
					const response = await api.post('/add_time', timeObject);
					if (response.data.message) {
						setLoading(false);
						closeModal();
					}

				} catch (err) {
					setError('Failed to post data');
					setLoading(false);
				}
			};

			postData();
		} else {
			setError(`Please complete all required fields with a ${"*"}`)
		}


	};

	const isManagerConnectedUser = activeTeamManagers.findIndex((member) => member.employee?.user?.id == user?.id);
	const canSeeActivity = profile.userProfile?.id === user?.id || isManagerConnectedUser != -1;

	const t = useTranslations();
	const breadcrumb = [
		{ title: activeTeam?.name || '', href: '/' },
		{ title: JSON.parse(t('pages.profile.BREADCRUMB')) || '', href: `/profile/${params.memberId}` }
	];

	const activityScreens = {
		Tasks: <UserProfileTask profile={profile} tabFiltered={hook} />,
		Screenshots: <ScreenshootTab />,
		Apps: <AppsTab />,
		'Visited Sites': <VisitedSitesTab />
	};

	const profileIsAuthUser = useMemo(() => profile.isAuthUser, [profile.isAuthUser]);
	const hookFilterType = useMemo(() => hook.filterType, [hook.filterType]);

	const changeActivityFilter = useCallback(
		(filter: FilterTab) => {
			setActivityFilter(filter);
		},
		[setActivityFilter]
	);

	React.useEffect(() => {
		setActivityTypeFilter((prev) => ({
			...prev,
			member: profile.member ? profile.member : null
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [profile.member]);

	React.useEffect(() => {
		getEmployeeDayPlans(profile.member?.employeeId ?? '');
	}, [getEmployeeDayPlans, profile.member?.employeeId]);

	const calculateTimeDifference = () => {

		if (!startTime || !endTime) {
			return;
		}

		const [startHours, startMinutes] = startTime.split(':').map(Number);
		const [endHours, endMinutes] = endTime.split(':').map(Number);

		const startTotalMinutes = startHours * 60 + startMinutes;
		const endTotalMinutes = endHours * 60 + endMinutes;

		const diffMinutes = endTotalMinutes - startTotalMinutes;
		if (diffMinutes < 0) {
			return;
		}

		const hours = Math.floor(diffMinutes / 60);
		const minutes = diffMinutes % 60;

		setTimeDifference(`${hours} Hours ${minutes} Minutes`);
	};

	useEffect(() => {
		calculateTimeDifference();
	}, [endTime, startTime]);

	useEffect(() => {
		if (task == '') {
			setTask(tasks[0]?.id);
		}
		if (team == '') {
			members && setTeam(members[0].id);
		}

	}, [tasks, members])

	return (
		<>
			{Array.isArray(members) && members.length && !profile.member ? (
				<MainLayout>
					<div className=" absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2">
						<div className="flex flex-col justify-center items-center gap-5">
							<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
								{t('common.MEMBER')} {t('common.NOT_FOUND')}!
							</Text>

							<Text className=" font-light text-center text-gray-400">
								{t('pages.profile.MEMBER_NOT_FOUND_MSG_1')}
							</Text>
							<Text className=" font-light text-center text-gray-400">
								{t('pages.profile.MEMBER_NOT_FOUND_MSG_1')}
							</Text>

							<Button className="m-auto font-normal rounded-lg ">
								<Link href="/">{t('pages.profile.GO_TO_HOME')}</Link>
							</Button>
						</div>
					</div>
				</MainLayout>
			) : (
				<MainLayout showTimer={profileIsAuthUser && isTrackingEnabled}>
					<ResizablePanelGroup direction="vertical">
						<ResizablePanel defaultSize={47} maxSize={50}>
							<MainHeader
								fullWidth={fullWidth}
								className={clsxm(hookFilterType && ['pb-0'], 'pb-2', 'pt-20 sticky top-20 z-50')}
							>
								{/* Breadcrumb */}
								<div className="flex items-center gap-8">
									<Link href="/">
										<ArrowLeftIcon className="w-6 h-6" />
									</Link>

									<Breadcrumb paths={breadcrumb} className="text-sm" />
								</div>

								{/* User Profile Detail */}
								<div className="flex flex-col items-center justify-between py-5 md:py-10 md:flex-row">
									<UserProfileDetail member={profile.member} />
									<button
										onClick={() => openModal()}
										className="p-[10px] text-white rounded-[10px] border-[1px] text-[15px] flex items-center bg-[#3826A6]"
									>
										<MdOutlineMoreTime size={20} className="mr-[10px]" />{"Add manual time"}
									</button>
									{profileIsAuthUser && isTrackingEnabled && (
										<Timer
											className={clsxm(
												'p-5 rounded-2xl shadow-xlcard',
												'dark:border-[0.125rem] dark:border-[#28292F]',
												'dark:bg-[#1B1D22]'
											)}
										/>
									)}
								</div>
								{/* TaskFilter */}
								<TaskFilter profile={profile} hook={hook} />
							</MainHeader>
						</ResizablePanel>
						<ResizableHandle withHandle />

						{/* Divider */}
						<div>
							<Modal
								isOpen={isOpen}
								closeModal={closeModal}
								title={'Add time'}
								className="bg-light--theme-light dark:bg-dark--theme-light py-5 rounded-xl w-full md:min-w-[20vw] md:max-w-fit h-[auto] justify-start"
								titleClass="text-[16px]"
							>
								<Divider className="mt-4" />
								<form onSubmit={handleSubmit}>
									<div className="mb-4">
										<label className="block text-gray-700 mb-1">Date<span className="text-[#de5505e1] ml-1">*</span></label>
										<input
											type="date"
											value={date}
											onChange={(e) => setDate(e.target.value)}
											className="w-full p-2 border border-gray-300 rounded-[10px]"
											required
										/>
									</div>

									<div className="mb-4 flex items-center">
										<label className="block text-gray-700 mr-2">Billable</label>
										<div
											className={`w-12 h-6 flex items-center bg-[#3726a662] rounded-full p-1 cursor-pointer `}
											onClick={() => setIsBillable(!isBillable)}
											style={isBillable ? { background: 'linear-gradient(to right, #3726a662, transparent)' } : { background: '#3726a662' }}
										>
											<div
												className={`bg-[#3826A6] w-4 h-4 rounded-full shadow-md transform transition-transform ${isBillable ? 'translate-x-6' : 'translate-x-0'}`}
											/>
										</div>
									</div>
									<div className='flex items-center'>
										<div className="mb-4 mr-[6px]">
											<label className="block text-gray-700 mb-1">Start time<span className="text-[#de5505e1] ml-1">*</span></label>
											<input
												type="time"
												value={startTime}
												onChange={(e) => setStartTime(e.target.value)}
												className="w-full p-2 border border-gray-300 rounded-[10px]"
												min={minStartTime}
												required
											/>
										</div>

										<div className="mb-4">
											<label className="block text-gray-700 mb-1">End time<span className="text-[#de5505e1] ml-1">*</span></label>
											<input
												type="time"
												value={endTime}
												onChange={(e) => setEndTime(e.target.value)}
												className="w-full p-2 border border-gray-300 rounded-[10px]"
												min={startTime}
												required
											/>
										</div>
									</div>

									<div className="mb-4 flex items-center">
										<label className="block text-gray-700 mb-1">Added hours: </label>
										<div
											className="ml-[10px] p-[10px] flex items-center border-[#410a504e] rounded-[10px]"
											style={{ background: 'linear-gradient(to right, #3726a662, #410a504e )' }}
										>
											<IoIosTimer size={20} className="mr-[10px]" />
											{timeDifference}
										</div>
									</div>

									<div className="mb-4">
										<label className="block text-gray-700 mb-1">Team<span className="text-[#de5505e1] ml-1">*</span></label>
										<select
											value={team}
											onChange={(e) => setTeam(e.target.value)}
											className="w-full p-2 border border-gray-300 rounded-[10px]"
											required
										>
											{members?.map((member) => (
												<option key={member.id} value={member.id}>{member.employee?.user?.firstName}</option>))
											}
										</select>
									</div>

									<div className="mb-4">
										<label className="block text-gray-700 mb-1">Task<span className="text-[#de5505e1] ml-1">*</span></label>
										<select
											value={task}
											onChange={(e) => setTask(e.target.value)}
											className="w-full p-2 border border-gray-300 rounded-[10px]"
											required
										>
											{tasks?.map((task) => (
												<option key={task.id} value={task.id}>{task.title}</option>
											))}
										</select>
									</div>

									<div className="mb-4">
										<label className="block text-gray-700 mb-1">Description</label>
										<textarea
											value={description}
											placeholder="What worked on?"
											onChange={(e) => setDescription(e.target.value)}
											className="w-full p-2 border border-gray-300 rounded-[10px]"
										/>
									</div>

									<div className="mb-4">
										<label className="block text-gray-700 mb-1">Reason</label>
										<textarea
											value={reason}
											onChange={(e) => setReason(e.target.value)}
											className="w-full p-2 border border-gray-300 rounded-[10px]"
										/>
									</div>

									<div className="flex justify-between items-center">
										<button type="button" className="text-[#3826A6] p-[12px] rounded-[10px] border-[1px]">View timesheet</button>
										<button type="submit" className="bg-[#3826A6] min-w-[110px] flex items-center text-white p-[12px] rounded-[10px]">
											{loading ? <FiLoader size={20} className="animate-spin" /> : "Add time"}
										</button>
									</div>
									<div className="m-4 text-[#ff6a00de]">{errorMsg}</div>

								</form>
							</Modal>
						</div>
						{/* <div className="h-0.5 bg-[#FFFFFF14]"></div> */}
						<ResizablePanel defaultSize={53} maxSize={95} className="!overflow-y-scroll custom-scrollbar">
							{hook.tab == 'worked' && canSeeActivity && (
								<Container fullWidth={fullWidth} className="py-8">
									<div className={clsxm('flex justify-start items-center gap-4 mt-3')}>
										{Object.keys(activityScreens).map((filter, i) => (
											<div
												key={i}
												className="flex cursor-pointer justify-start items-center gap-4"
											>
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

							<Container fullWidth={fullWidth} className="mb-10">
								{hook.tab !== 'worked' || activityFilter == 'Tasks' ? (
									<UserProfileTask profile={profile} tabFiltered={hook} />
								) : (
									activityScreens[activityFilter] ?? null
								)}
							</Container>
						</ResizablePanel>
					</ResizablePanelGroup>
				</MainLayout>
			)}
		</>
	);
});

function UserProfileDetail({ member }: { member?: OT_Member }) {
	const user = useMemo(() => member?.employee.user, [member?.employee.user]);
	const userName = `${user?.firstName || ''} ${user?.lastName || ''}`;
	const imgUrl = user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
	const imageUrl = useMemo(() => imgUrl, [imgUrl]);
	const size = 100;
	const { timerStatus } = useTimer();
	const timerStatusValue: ITimerStatusEnum = useMemo(() => {
		return getTimerStatusValue(timerStatus, member, false);
	}, [timerStatus, member]);

	return (
		<div className="flex items-center mb-4 space-x-4 md:mb-0">
			<div
				className={clsx(
					`w-[100px] h-[100px]`, // removed the size variable from width and height, as passing variables is not supported by tailwind
					'flex justify-center items-center relative',
					'rounded-full text-white',
					'shadow-md text-7xl dark:text-6xl font-thin font-PlusJakartaSans ',
					!imageUrl && 'dark:border-[0.375rem] dark:border-[#26272C]'
				)}
				style={{
					backgroundColor: `${stc(userName)}80`
				}}
			>
				{imageUrl && isValidUrl(imageUrl) ? (
					<Avatar
						size={size}
						className="relative dark:border-[0.375rem] dark:border-[#26272C]"
						imageUrl={imageUrl}
						alt={userName}
						imageTitle={userName.charAt(0)}
					>
						<TimerStatus
							status={timerStatusValue}
							className="absolute z-20 bottom-3 right-[10%] -mb-5 border-[0.2956rem] border-white dark:border-[#26272C]"
							tooltipClassName="mt-24 dark:mt-20 mr-3"
						/>
					</Avatar>
				) : (
					<>
						{imgTitle(userName).charAt(0)}
						<TimerStatus
							status={timerStatusValue}
							className="absolute z-20 border-[0.2956rem] border-white dark:border-[#26272C]"
							tooltipClassName="absolute -bottom-[0.625rem] dark:-bottom-[0.75rem] right-[10%] w-[1.875rem] h-[1.875rem] rounded-full"
						/>
					</>
				)}
			</div>

			<div className="flex flex-col gap-3.5">
				<Text.Heading as="h3" className="text-2xl md:text-4xl">
					{user?.firstName} {user?.lastName}
				</Text.Heading>
				<Text className="text-lg text-gray-500">{user?.email}</Text>
			</div>
		</div>
	);
}

export default withAuthentication(Profile, { displayName: 'ProfilePage' });
