'use client';

import { MainLayout } from '@/lib/layout';
import { useOrganizationProjects, useOrganizationTeams } from '@/app/hooks';
import { withAuthentication } from '@/lib/app/authenticator';
import { useEffect, useMemo, useState } from 'react';
import { Grid, List, ListFilterPlus, Plus, Search, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, InputField, Paginate } from '@/lib/components';
import { usePagination } from '@/app/hooks/features/usePagination';
import { IProject } from '@/app/interfaces';
import { ExportModeSelect } from '@components/shared/export-mode-select';
import { DatePickerWithRange } from '@components/shared/date-range-select';
import { DateRange } from 'react-day-picker';
import { endOfMonth, startOfMonth } from 'date-fns';
import GridItem from './grid-item';
import { DataTableProject } from './data-table';
import { LAST_SELECTED_PROJECTS_VIEW } from '@/app/constants';
import { useTranslations } from 'next-intl';

type TViewMode = 'GRID' | 'LIST';

function PageComponent() {
	const { isTrackingEnabled } = useOrganizationTeams();
	const lastSelectedView = useMemo(() => localStorage.getItem(LAST_SELECTED_PROJECTS_VIEW) as TViewMode, []);
	const [selectedView, setSelectedView] = useState<TViewMode>(lastSelectedView ?? 'LIST');
	const { getOrganizationProjects, organizationProjects } = useOrganizationProjects();
	const [dateRange] = useState<DateRange>({
		from: startOfMonth(new Date()),
		to: endOfMonth(new Date())
	});
	const viewItems: { title: string; name: TViewMode; icon: any }[] = useMemo(
		() => [
			{
				title: 'List view',
				name: 'LIST',
				icon: List
			},
			{
				title: 'Grid view',
				name: 'GRID',
				icon: Grid
			}
		],
		[]
	);
	const t = useTranslations();

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<IProject>(organizationProjects);

	useEffect(() => {
		getOrganizationProjects();
	}, [getOrganizationProjects]);

	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="!p-0 pb-1 !overflow-hidden w-full"
			childrenClassName="w-full h-full"
			mainHeaderSlot={
				<div className="flex flex-col p-4 dark:bg-dark--theme">
					<div className="flex flex-col items-start justify-between gap-3">
						<div className="flex items-center justify-center h-10 gap-8">
							<h3 className=" text-3xl font-medium">Projects</h3>
						</div>
						<div className=" h-14 flex items-center justify-between w-full">
							<div className="w-[20rem] h-full flex items-end justify-center">
								<ul className="flex relative text-lg w-full justify-evenly">
									{viewItems.map((item, index) => (
										<li
											onClick={() => {
												setSelectedView(item.name);
												localStorage.setItem(LAST_SELECTED_PROJECTS_VIEW, item.name);
											}}
											key={index}
											className={cn(
												'w-[10rem] cursor-pointer gap-2 flex items-center justify-center',
												selectedView == item.name ? ' text-primary' : ' text-slate-500'
											)}
										>
											<item.icon className="h-4 w-4" />
											<span>{item.title}</span>
										</li>
									))}
									<div
										className={cn(
											'w-1/2 absolute z-[20] -bottom-[1.125rem] h-[.125rem] transition-all bg-primary',
											selectedView == 'LIST' ? 'left-0' : 'left-[10rem]'
										)}
									></div>
								</ul>
							</div>

							<div className="h-full flex items-end">
								<Button variant="grey" className=" text-primary font-medium">
									<Plus size={15} /> <span>Create New Project</span>
								</Button>
							</div>
						</div>
					</div>
				</div>
			}
		>
			<div className="flex flex-col p-4 w-full h-full  gap-6 dark:bg-dark--theme mt-6">
				<div className="border rounded-lg bg-white  p-3 space-y-6">
					<div className=" rounded flex items-center justify-between font-light">
						<div className="w-80 flex border  h-[2.2rem] items-center px-4 rounded-lg">
							<Search size={15} className=" text-slate-300" />{' '}
							<InputField placeholder="Search ..." className=" h-full border-none" noWrapper />
						</div>
						<div className="flex gap-3">
							<DatePickerWithRange defaultValue={dateRange} onChange={(data) => console.log(data)} />
							<Button
								type="button"
								className=" border-gray-200 hover:bg-slate-100 text-sm min-w-fit text-black h-[2.2rem] font-light"
								variant="outline"
							>
								<ListFilterPlus size={15} /> <span>{t('common.FILTER')}</span>
							</Button>
							<ExportModeSelect className="hover:bg-slate-100" onChange={(data) => console.log(data)} />
							<Button
								type="button"
								className=" border-gray-200 text-sm hover:bg-slate-100 min-w-fit text-black  h-[2.2rem] font-light"
								variant="outline"
							>
								<Settings2 size={15} /> <span>{t('common.VIEW')}</span>
							</Button>
						</div>
					</div>
					{selectedView === 'LIST' ? (
						<div className="w-full">
							<DataTableProject
								data={currentItems.map((el) => ({
									project: {
										name: el.name,
										imageUrl: el.imageUrl,
										color: el.color
									},

									status: el.status,
									startDate: el.startDate,
									endDate: el.endDate,
									members: el.members,
									managers: el.members,
									teams: el.teams
								}))}
							/>
							<div className=" bg-white dark:bg-dark--theme px-4 py-4 flex">
								<Paginate
									total={total}
									onPageChange={onPageChange}
									pageCount={1} // Set Static to 1 - It will be calculated dynamically in Paginate component
									itemsPerPage={itemsPerPage}
									itemOffset={itemOffset}
									endOffset={endOffset}
									setItemsPerPage={setItemsPerPage}
									className="pt-0"
								/>
							</div>
						</div>
					) : selectedView === 'GRID' ? (
						<div className=" w-full flex-wrap flex gap-3">
							{currentItems
								.map((el) => ({
									project: {
										name: el.name,
										imageUrl: el.imageUrl,
										color: el.color
									},

									status: el.status,
									startDate: el.startDate,
									endDate: el.endDate,
									members: el.members,
									managers: el.members,
									teams: el.teams
								}))
								.map((el) => (
									<GridItem key={el.project.name} data={el} />
								))}
						</div>
					) : null}
				</div>
			</div>
		</MainLayout>
	);
}

export default withAuthentication(PageComponent, { displayName: 'ProjectPage' });
