'use client';

import { KanbanTabs } from '@app/constants';
import { useAuthenticateUser, useModal, useOrganizationTeams } from '@app/hooks';
import { useKanban } from '@app/hooks/features/useKanban';
import KanbanBoardSkeleton from '@components/shared/skeleton/KanbanBoardSkeleton';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Container } from 'lib/components';
import { KanbanView } from 'lib/features/team-members-kanban-view';
import { MainLayout } from 'lib/layout';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import ImageComponent, { ImageOverlapperProps } from 'lib/components/image-overlapper';
import Separator from '@components/ui/separator';
import HeaderTabs from '@components/pages/main/header-tabs';
import { AddIcon, PeoplesIcon } from 'assets/svg';
import { InviteFormModal } from 'lib/features/team/invite/invite-form-modal';
import { userTimezone } from '@app/helpers';
import KanbanSearch from '@components/pages/kanban/search-bar';
import {
	EpicPropertiesDropdown,
	StatusDropdown,
	TStatusItem,
	TaskLabelsDropdown,
	TaskPropertiesDropdown,
	TaskSizesDropdown,
	taskIssues,
	useStatusValue
} from 'lib/features';
import { useRecoilValue } from 'recoil';
import { fullWidthState } from '@app/stores/fullWidth';
import { CircleIcon } from 'lucide-react';
import { XMarkIcon } from '@heroicons/react/20/solid';

const Kanban = () => {
	const {
		data,
		setSearchTasks,
		searchTasks,
		isLoading,
		setPriority,
		setSizes,
		setLabels,
		setEpics,
		setIssues,
		issues
	} = useKanban();

	const { activeTeam, isTrackingEnabled } = useOrganizationTeams();
	const t = useTranslations();
	const params = useParams<{ locale: string }>();
	const fullWidth = useRecoilValue(fullWidthState);
	const currentLocale = params ? params.locale : null;
	const [activeTab, setActiveTab] = useState(KanbanTabs.TODAY);
	const employee = useSearchParams().get('employee');
	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: t('common.KANBAN'), href: `/${currentLocale}/kanban` }
		],
		[activeTeam?.name, currentLocale, t]
	);

	const activeTeamMembers = activeTeam?.members ? activeTeam.members : [];

	const teamMembers: ImageOverlapperProps[] = [];

	activeTeamMembers.map((member: any) => {
		teamMembers.push({
			id: member.employee.user.id,
			url: member.employee.user.imageUrl,
			alt: member.employee.user.firstName
		});
	});
	const tabs = [
		{ name: t('common.TODAY'), value: KanbanTabs.TODAY },
		{ name: t('common.YESTERDAY'), value: KanbanTabs.YESTERDAY },
		{ name: t('common.TOMORROW'), value: KanbanTabs.TOMORROW }
	];
	const { user } = useAuthenticateUser();
	const { openModal, isOpen, closeModal } = useModal();
	const timezone = userTimezone();
	const { items } = useStatusValue<'issueType'>({
		status: taskIssues,
		value: issues as any,
		onValueChange: setIssues as any
	});

	useEffect(() => {
		const lastPath = breadcrumbPath.slice(-1)[0];
		if (employee) {
			if (lastPath.title == 'Kanban') {
				breadcrumbPath.push({ title: employee, href: `/${currentLocale}/kanban?employee=${employee}` });
			} else {
				breadcrumbPath.pop();
				breadcrumbPath.push({ title: employee, href: `/${currentLocale}/kanban?employee=${employee}` });
			}
		} else {
			if (lastPath.title !== 'Kanban') {
				breadcrumbPath.pop();
			}
		}
	}, [breadcrumbPath, currentLocale, employee]);
	return (
		<>
			<MainLayout showTimer={isTrackingEnabled} className="h-full">
				<Container fullWidth={fullWidth}>
					<div className="flex  dark:bg-dark-high h-14 items-center justify-between">
						<div className="flex justify-center   items-center gap-8 h-10">
							<PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
							<Breadcrumb paths={breadcrumbPath} className="text-sm flex items-center justify-center" />
						</div>
						<div className="flex h-12 w-max items-center justify-center   gap-1">
							<HeaderTabs kanban={true} linkAll={true} />
						</div>
					</div>
					<div className="flex h-14 justify-between items-center dark:bg-dark-high">
						<h1 className="text-4xl font-semibold ">
							{t('common.KANBAN')} {t('common.BOARD')}
						</h1>
						<div className="flex h-full border items-end space-x-2">
							<strong className="text-gray-400">
								{`(`}
								{timezone.split('(')[1]}
							</strong>
							<div className="">
								<Separator />
							</div>
							<div className="border p-1 border-red-600 flex items-center justify-center bg-red-600">
								<ImageComponent onAvatarClickRedirectTo="kanbanTasks" images={teamMembers} />
							</div>
							<div className="">
								<Separator />
							</div>

							<button
								onClick={openModal}
								className="p-2 rounded-full border-2 border-[#0000001a] dark:border-white"
							>
								{/* <AddIcon width={24} height={24} className={'dark:stroke-white'} /> */}
								<AddIcon className="w-6 h-6 text-foreground" />
							</button>
						</div>
					</div>
					<div className="relative flex flex-col lg:flex-row justify-between items-center dark:bg-dark-high">
						<div className="flex flex-row">
							{tabs.map((tab) => (
								<div
									key={tab.name}
									onClick={() => setActiveTab(tab.value)}
									className={`cursor-pointer px-5 text-base font-semibold ${
										activeTab === tab.value
											? 'border-b-[#3826A6] text-[#3826A6] dark:text-white dark:border-b-white'
											: 'border-b-white dark:border-b-[#191A20] dark:text-white text-[#282048]'
									}`}
									style={{
										borderBottomWidth: '3px',
										borderBottomStyle: 'solid'
									}}
								>
									{tab.name}
								</div>
							))}
						</div>
						<div className="flex space-x-2">
							<div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light">
								<EpicPropertiesDropdown
									onValueChange={(_, values) => setEpics(values || [])}
									className="lg:min-w-[140px] pt-[3px] mt-4 mb-2 lg:mt-0"
									multiple={true}
								/>
							</div>
							{/* <div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light"> */}
							<div className="relative">
								<div className="bg-[#F2F2F2] dark:bg-dark--theme-light absolute flex items-center p-2 justify-between w-40 h-11 border input-border rounded-xl">
									<span className="flex">
										<div
											className="h-6 w-6 p-1.5 rounded-md"
											style={{
												backgroundColor: issues.bgColor ?? 'transparent'
											}}
										>
											{issues.icon ?? <CircleIcon className="h-3 w-3" />}
										</div>
										<p>{issues.name}</p>
									</span>
									{issues.value && (
										<div
											onClick={() =>
												setIssues({
													name: 'Issues',
													icon: null,
													bgColor: '',
													value: ''
												})
											}
											className="w-5 h-5 z-50 p-0.5 cursor-pointer"
										>
											<XMarkIcon className="h-4 w-4  dark:text-white" />
										</div>
									)}
								</div>

								<StatusDropdown
									taskStatusClassName={'w-40 bg-red-500 h-10 opacity-0'}
									showIssueLabels={true}
									items={items}
									value={issues}
									onChange={(e) => {
										setIssues(items.find((v) => v.name == e) as TStatusItem);
									}}
									issueType="issue"
								/>
							</div>
							{/* </div> */}
							<div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light">
								<TaskLabelsDropdown
									onValueChange={(_, values) => setLabels(values || [])}
									className="lg:min-w-[140px]"
									multiple={true}
								/>
							</div>
							<div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light">
								<TaskPropertiesDropdown
									onValueChange={(_, values) => setPriority(values || [])}
									className="lg:min-w-[140px]"
									multiple={true}
								/>
							</div>
							<div className="input-border rounded-xl h-11 bg-[#F2F2F2] dark:bg-dark--theme-light">
								<TaskSizesDropdown
									onValueChange={(_, values) => setSizes(values || [])}
									className="lg:min-w-[140px]"
									multiple={true}
								/>
							</div>
							<div className="">
								<Separator />
							</div>
							<KanbanSearch setSearchTasks={setSearchTasks} searchTasks={searchTasks} />
						</div>
					</div>
				</Container>
				<div className="">
					{/** TODO:fetch teamtask based on days */}
					{activeTab && ( // add filter for today, yesterday and tomorrow
						<div className="">
							{Object.keys(data).length > 0 ? (
								<KanbanView isLoading={isLoading} kanbanBoardTasks={data} />
							) : (
								<KanbanBoardSkeleton />
							)}
						</div>
					)}
				</div>
			</MainLayout>
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</>
	);
};

export default withAuthentication(Kanban, { displayName: 'Kanban' });
