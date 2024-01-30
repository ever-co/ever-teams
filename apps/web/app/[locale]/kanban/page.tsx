'use client';

import { KanbanTabs } from '@app/constants';
import { useOrganizationTeams } from '@app/hooks';
import { useKanban } from '@app/hooks/features/useKanban';
import KanbanBoardSkeleton from '@components/shared/skeleton/KanbanBoardSkeleton';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Button, Dropdown, InputField } from 'lib/components';
import { AddIcon, SearchNormalIcon, Settings4Icon } from 'lib/components/svgs';
import { KanbanView } from 'lib/features/team-members-kanban-view';
import { MainLayout } from 'lib/layout';
import { ChangeEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import ImageOverlapper, { IImageOverlapper } from 'lib/components/image-overlapper';
import Separator from '@components/ui/separator';
import { clsxm } from '@app/utils';

const Kanban = () => {
	const { data } = useKanban();
	const { activeTeam } = useOrganizationTeams();
	const t = useTranslations();
	const params = useParams<{ locale: string }>();
	const currentLocale = params ? params.locale : null;
	const [activeTab, setActiveTab] = useState(KanbanTabs.TODAY);
	const breadcrumbPath = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: activeTeam?.name || '', href: '/' },
		{ title: 'Kanban Board', href: `/${currentLocale}/kanban` }
	];

	const activeTeamMembers = activeTeam?.members ? activeTeam.members : [];

	const teamMembers: IImageOverlapper[] = [];

	activeTeamMembers.map((member: any) => {
		teamMembers.push({
			id: member.employee.user.id,
			url: member.employee.user.imageUrl,
			alt: member.employee.user.firstName
		});
	});
	console.log('data-kanban', data);
	const tabs = [
		{ name: 'Today', value: KanbanTabs.TODAY },
		{ name: 'Yesterday', value: KanbanTabs.YESTERDAY },
		{ name: 'Tomorrow', value: KanbanTabs.TOMORROW }
	];
	// eslint-disable-next-line react/no-unstable-nested-components
	const Label = ({ active, selected }: { active: string; selected: string }) => (
		<div
			style={{
				color: active || selected ? 'test' : 'test',
				fontWeight: selected ? 'bold' : 'normal'
			}}
			className="text-left"
		>
			{active}
		</div>
	);

	const sampleDropdownItem = (key: string) => {
		const data = {
			key: '1',
			Label: Label,
			selectedLabel: <strong>{key}</strong>,
			itemTitle: key
			// other properties can be added as needed
		};
		return data;
	};
	return (
		<>
			<MainLayout showTimer={true}>
				<div className={' flex flex-col bg-white dark:bg-dark--theme h-auto z-10 px-[32px] mx-[0px] w-full'}>
					<div className="flex flex-row items-center justify-between mt-[34px]">
						<Breadcrumb paths={breadcrumbPath} className="text-sm" />
					</div>
					<div className="flex justify-between items-center mt-10">
						<h1 className="text-4xl font-semibold ">Kanban Board</h1>
						<div className="flex w-fit items-center space-x-2">
							<strong className="text-gray-400">08:00 ( UTC +04:30 )</strong>
							<div className="mt-1">
								<Separator />
							</div>
							<ImageOverlapper images={teamMembers} />
							<div className="mt-1">
								<Separator />
							</div>
							<button className="p-2 rounded-full border-2 border-[#0000001a] dark:border-white">
								<AddIcon width={24} height={24} className={'dark:stroke-white'} />
							</button>
						</div>
					</div>
					<div className="relative flex flex-row justify-between items-center mt-10">
						<div className="flex flex-row">
							{tabs.map((tab) => (
								<div
									key={tab.name}
									onClick={() => setActiveTab(tab.value)}
									className={`cursor-pointer pt-2.5 px-5 pb-[30px] text-base font-semibold ${
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
							<Dropdown
								searchBar={false}
								className="w-24"
								buttonClassName={clsxm(
									'py-0 font-medium h-11',
									'bg-light--theme-light dark:bg-dark--theme-light dark:text-white font-normal'
								)}
								value={sampleDropdownItem('Epic') as any}
								onChange={(e: any) => console.log(e)}
								items={[sampleDropdownItem] as any}
							/>
							<Dropdown
								searchBar={false}
								className="w-24"
								buttonClassName={clsxm(
									'py-0 font-medium h-11',
									'bg-light--theme-light dark:bg-dark--theme-light dark:text-white font-normal'
								)}
								value={sampleDropdownItem('Label') as any}
								onChange={(e: any) => console.log(e)}
								items={[sampleDropdownItem] as any}
							/>
							<button
								className={clsxm(
									'p-3 px-5 flex space-x-2 input-border rounded-xl items-center text-sm',
									'h-[2.75rem]'
								)}
							>
								<Settings4Icon className="dark:stroke-white" />
								<span>{t('common.FILTER')}</span>
							</button>
							<div className="mt-1">
								<Separator />
							</div>
							<div className="w-44">
								<InputField
									type="text"
									placeholder={t('common.SEARCH')}
									className="mb-0 h-10"
									leadingNode={
										<Button
											variant="ghost"
											className="p-0 m-0 ml-[0.9rem] min-w-0 absolute right-3"
											type="submit"
										>
											<SearchNormalIcon className="w-[1rem] dark:stroke-[#ffffff] " />
										</Button>
									}
									onChange={(e: ChangeEvent<HTMLInputElement>) => {
										console.log(e.target.value);
									}}
								/>
							</div>
						</div>
					</div>
				</div>
				<div>
					{/** TODO:fetch teamtask based on days */}
					{activeTab && ( // add filter for today, yesterday and tomorrow
						<>
							{Object.keys(data).length > 0 ? (
								<KanbanView kanbanBoardTasks={data} />
							) : (
								<KanbanBoardSkeleton />
							)}
						</>
					)}
				</div>
			</MainLayout>
		</>
	);
};

export default withAuthentication(Kanban, { displayName: 'Kanban' });
