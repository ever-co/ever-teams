'use client';

import { MainLayout } from '@/lib/layout';
import { useModal, useOrganizationProjects, useOrganizationTeams } from '@/app/hooks';
import { withAuthentication } from '@/lib/app/authenticator';
import { useEffect, useMemo, useState } from 'react';
import { Grid, List, ListFilterPlus, Plus, Search, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, InputField, Paginate, SpinnerLoader } from '@/lib/components';
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
import { useSearchParams } from 'next/navigation';
import FiltersCardModal from './filters-card-modal';
import AddOrEditProjectModal from '@/lib/features/project/add-or-edit-project';

type TViewMode = 'GRID' | 'LIST';

function PageComponent() {
	const t = useTranslations();
	const {
		isOpen: isFiltersCardModalOpen,
		closeModal: closeFiltersCardModal,
		openModal: openFiltersCardModal
	} = useModal();
	const { isOpen: isProjectModalOpen, closeModal: closeProjectModal, openModal: openProjectModal } = useModal();
	const { isTrackingEnabled } = useOrganizationTeams();
	const lastSelectedView = useMemo(() => {
		try {
			return localStorage.getItem(LAST_SELECTED_PROJECTS_VIEW) as TViewMode;
		} catch (error) {
			console.error('Failed to access localStorage:', error);
			return null;
		}
	}, []);
	const [selectedView, setSelectedView] = useState<TViewMode>(lastSelectedView ?? 'LIST');
	const [projects, setProjects] = useState<IProject[]>([]);
	const { getOrganizationProjects, getOrganizationProjectsLoading } = useOrganizationProjects();
	const [dateRange] = useState<DateRange>({
		from: startOfMonth(new Date()),
		to: endOfMonth(new Date())
	});
	const { activeTeam } = useOrganizationTeams();
	const activeTeamProjects = useMemo(() => activeTeam?.projects?.map((el) => el.id) ?? [], [activeTeam?.projects]);
	const params = useSearchParams();
	const viewItems: { title: string; name: TViewMode; icon: any }[] = useMemo(
		() => [
			{
				title: t('pages.projects.views.LIST_VIEW'),
				name: 'LIST',
				icon: List
			},
			{
				title: t('pages.projects.views.GRID_VIEW'),
				name: 'GRID',
				icon: Grid
			}
		],
		[t]
	);

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<IProject>(projects ?? []);

	useEffect(() => {
		const members = [...(params.get('managers')?.split(',') ?? []), ...(params.get('members')?.split(',') ?? [])];

		const queries = {
			...(members.length > 0 && {
				'where[members][employeeId]': members[0] // Available but can work with one employee ID
			})
		};

		/*
		TO DO:
		 - Filter by status
		 - Filter by budget type
		 - Filter by date range
		 - Filter by team

		 when the api is ready
		*/

		getOrganizationProjects({ queries }).then((data) => {
			if (data && data?.items?.length > 0) {
				setProjects(data.items);
			}
		});
	}, [getOrganizationProjects, params]);

	const filteredProjects = useMemo(
		() =>
			currentItems
				?.filter((el) => activeTeamProjects.includes(el.id))
				?.map((el) => ({
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
				})),
		[currentItems, activeTeamProjects]
	);

	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="!p-0 pb-1 !overflow-hidden w-full"
			childrenClassName="w-full h-full"
			mainHeaderSlot={
				<div className="flex flex-col p-4 dark:bg-dark--theme">
					<div className="flex flex-col items-start justify-between gap-3">
						<div className="flex items-center justify-center h-10 gap-8">
							<h3 className=" text-3xl font-medium">{t('pages.projects.projectTitle.PLURAL')}</h3>
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
								<Button onClick={openProjectModal} variant="grey" className=" text-primary font-medium">
									<Plus size={15} /> <span>{t('pages.projects.CREATE_NEW_PROJECT')}</span>
								</Button>
							</div>
						</div>
					</div>
				</div>
			}
		>
			<div className="flex flex-col p-4 w-full h-full  gap-6 dark:bg-dark--theme mt-6">
				<div className="border bg-light--theme-light dark:bg-transparent rounded-lg p-3 space-y-6">
					<div className=" rounded flex items-center justify-between font-light">
						<div className="w-80 flex border dark:border-white   h-[2.2rem] items-center px-4 rounded-lg">
							<Search size={15} className=" text-slate-300" />{' '}
							<InputField
								placeholder="Search ..."
								className=" h-full border-none bg-transparent dark:bg-transparent"
								noWrapper
							/>
						</div>
						<div className="flex gap-3">
							<DatePickerWithRange
								defaultValue={dateRange}
								onChange={() => {
									/* TODO: Implement date range handling */
								}}
								className="bg-transparent dark:bg-transparent dark:border-white"
							/>
							<Button
								onClick={openFiltersCardModal}
								type="button"
								className=" border-gray-200 !border hover:bg-slate-100 dark:border text-sm min-w-fit text-black h-[2.2rem] font-light hover:dark:bg-transparent"
								variant="outline"
							>
								<ListFilterPlus size={15} /> <span>{t('common.FILTER')}</span>
							</Button>
							<ExportModeSelect
								className="hover:bg-slate-100 bg-transparent dark:bg-transparent dark:border-white hover:dark:bg-transparent "
								onChange={() => {
									/* TODO: Implement export handling */
								}}
							/>
							<Button
								type="button"
								className=" border-gray-200 text-sm hover:bg-slate-100 min-w-fit text-black  h-[2.2rem] font-light hover:dark:bg-transparent"
								variant="outline"
							>
								<Settings2 size={15} /> <span>{t('common.VIEW')}</span>
							</Button>
						</div>
					</div>
					{selectedView === 'LIST' ? (
						<div key="list" className="w-full">
							<DataTableProject loading={getOrganizationProjectsLoading} data={filteredProjects} />
							<div className=" dark:bg-dark--theme px-4 py-4 flex">
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
						<div key="grid" className=" w-full flex-wrap flex gap-3">
							{getOrganizationProjectsLoading ? (
								<div className="w-full flex items-center justify-center">
									<SpinnerLoader />
								</div>
							) : (
								filteredProjects.map((el) => <GridItem key={el.project.name} data={el} />)
							)}
						</div>
					) : null}
				</div>
				<FiltersCardModal closeModal={closeFiltersCardModal} open={isFiltersCardModalOpen} />
				<AddOrEditProjectModal closeModal={closeProjectModal} open={isProjectModalOpen} />
			</div>
		</MainLayout>
	);
}

export default withAuthentication(PageComponent, { displayName: 'ProjectsPage' });
