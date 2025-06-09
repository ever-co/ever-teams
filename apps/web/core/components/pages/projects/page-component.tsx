'use client';

import { MainLayout } from '@/core/components/layouts/default-layout';
import { useLocalStorageState, useModal, useOrganizationProjects, useOrganizationTeams } from '@/core/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Archive,
	ArrowLeftIcon,
	Check,
	Grid,
	List,
	ListFilterPlus,
	Plus,
	RotateCcw,
	Search,
	Settings2
} from 'lucide-react';
import { cn } from '@/core/lib/helpers';
import { Button, Container } from '@/core/components';
import { DatePickerWithRange } from '@/core/components/common/date-range-select';
import { DateRange } from 'react-day-picker';
import { endOfMonth, startOfMonth } from 'date-fns';
import { LAST_SELECTED_PROJECTS_VIEW } from '@/core/constants/config/constants';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import FiltersCardModal from '../../projects/filters-card-modal';
import { ProjectsListView } from './project-views/list-view';
import { VisibilityState } from '@tanstack/react-table';
import { ProjectViewDataType } from './project-views';
import { ProjectsGridView } from './project-views/grid-view';
import { ProjectExportMenu } from './project-export-menu';
import { Menu, Transition } from '@headlessui/react';
import { hidableColumnNames } from './project-views/list-view/data-table';
import { Checkbox } from '@/core/components/common/checkbox';
import { BulkArchiveProjectsModal } from '@/core/components/features/projects/bulk-actions/bulk-archive-projects-modal';
import { BulkRestoreProjectsModal } from '@/core/components/features/projects/bulk-actions/bulk-restore-projects-modal';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import { useParams } from 'next/navigation';
import { Breadcrumb } from '../../duplicated-components/breadcrumb';
import { InputField } from '../../duplicated-components/_input';
import { VerticalSeparator } from '../../duplicated-components/separator';
import { CreateProjectModal } from '../../features/projects/create-project-modal';
import { IOrganizationProject } from '@/core/types/interfaces/project/organization-project';

type TViewMode = 'GRID' | 'LIST';

function PageComponent() {
	const t = useTranslations();
	const {
		isOpen: isFiltersCardModalOpen,
		closeModal: closeFiltersCardModal,
		openModal: openFiltersCardModal
	} = useModal();
	const { isOpen: isProjectModalOpen, closeModal: closeProjectModal, openModal: openProjectModal } = useModal();
	const { isTrackingEnabled, activeTeam } = useOrganizationTeams();
	const [selectedView, setSelectedView] = useLocalStorageState<TViewMode>(LAST_SELECTED_PROJECTS_VIEW, 'LIST');
	const [projects, setProjects] = useState<ProjectViewDataType[]>([]);

	const router = useRouter();
	const fullWidth = useAtomValue(fullWidthState);
	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl?.locale;

	const { getOrganizationProjects, getOrganizationProjectsLoading, organizationProjects } = useOrganizationProjects();
	const [dateRange] = useState<DateRange>({
		from: startOfMonth(new Date()),
		to: endOfMonth(new Date())
	});
	const [searchTerm, setSearchTerm] = useState('');
	const params = useSearchParams();
	const showArchivedProjects = Boolean(params.get('archived'));
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

	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: 'Projects', href: `/${currentLocale}/projects` }
		],
		[currentLocale, t, activeTeam?.name]
	);

	const handleBack = () => router.back();

	const mapProjectToViewDataType = useCallback((project: IOrganizationProject): ProjectViewDataType => {
		return {
			project: {
				name: project.name,
				imageUrl: project.imageUrl,
				color: project.color,
				id: project.id
			},
			status: project.status,
			archivedAt: project.archivedAt,
			isArchived: project.isArchived,
			startDate: project.startDate,
			endDate: project.endDate,
			members: project.members,
			managers: project.members,
			teams: project.teams
		};
	}, []);

	const activeTeamProjects = useMemo(
		() => (activeTeam ? projects?.filter((el) => el.teams?.map((el) => el.id).includes(activeTeam?.id)) : []),
		[activeTeam, projects]
	);
	const filteredProjects = useMemo(
		() =>
			searchTerm
				? activeTeamProjects.filter((el) =>
						el.project?.name?.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase())
					)
				: activeTeamProjects || [],
		[activeTeamProjects, searchTerm]
	);
	const [selectedProjects, setSelectedProjects] = useState<Record<string, boolean>>({});
	const [tableColumnsVisibility, setTableColumnsVisibility] = useState<VisibilityState>({
		project: true,
		status: !showArchivedProjects,
		archivedAt: showArchivedProjects,
		startDate: true,
		endDate: true,
		members: true,
		managers: true,
		teams: true,
		actions: !showArchivedProjects,
		restore: showArchivedProjects
	});

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

		if (queries && Object.keys(queries).length > 0) {
			console.log('first', queries);
			getOrganizationProjects({ queries }).then((data) => {
				if (data && data.items && data.items.length > 0) {
					const projects = (data.items as IOrganizationProject[])
						?.filter((project) => (showArchivedProjects ? project.isArchived : !project.isArchived))
						.map(mapProjectToViewDataType);

					setProjects(projects);
					setSelectedProjects({}); // Reset projects selection
				}
			});
		} else {
			console.log('second');
			setProjects(
				organizationProjects
					?.filter((project) => (showArchivedProjects ? project.isArchived : !project.isArchived))
					.map(mapProjectToViewDataType)
			);
		}
	}, [getOrganizationProjects, params, organizationProjects, showArchivedProjects]);

	// Handle archived / active - table columns visibility
	useEffect(() => {
		setTableColumnsVisibility((prev) => ({
			...prev,
			status: !showArchivedProjects,
			archivedAt: showArchivedProjects,
			actions: !showArchivedProjects,
			restore: showArchivedProjects
		}));

		setSelectedProjects({}); // Reset projects selection
	}, [showArchivedProjects]);

	const handleSelectAllProjects = useCallback(() => {
		const areAllProjectsSelected = Object.keys(selectedProjects).length == filteredProjects.length;

		if (areAllProjectsSelected) {
			setSelectedProjects({});
		} else {
			setSelectedProjects(
				Object.fromEntries(
					filteredProjects.map((el) => {
						return [el.project.id, true];
					})
				)
			);
		}
	}, [filteredProjects, selectedProjects]);

	/**
	 * --- Bulk actions -------
	 */
	const isBulkAction = Object.keys(selectedProjects).length > 1;
	const {
		openModal: openBulkArchiveProjectsModal,
		closeModal: closeBulkArchiveProjectsModal,
		isOpen: isBulkArchiveProjectsModalOpen
	} = useModal();

	const {
		openModal: openBulkRestoreProjectsModal,
		closeModal: closeBulkRestoreProjectsModal,
		isOpen: isBulkRestoreProjectsModalOpen
	} = useModal();

	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="!p-0 pb-1 !overflow-hidden w-full"
			childrenClassName="w-full h-full"
			mainHeaderSlot={
				<Container fullWidth={fullWidth} className="flex flex-col p-4 dark:bg-dark--theme">
					<div className="flex items-center w-full">
						<button onClick={handleBack} className="p-1 transition-colors rounded-full hover:bg-gray-100">
							<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
						</button>
						<Breadcrumb paths={breadcrumbPath} className="text-sm" />
					</div>
					<div className="flex flex-col items-start justify-between gap-3">
						<div className="flex items-center justify-center h-10 gap-8">
							<h3 className="text-3xl font-medium ">{t('pages.projects.projectTitle.PLURAL')}</h3>
						</div>
						<div className="flex items-center justify-between w-full h-14">
							<div className="w-[20rem] h-full flex items-end justify-center">
								<ul className="relative flex w-full text-lg justify-evenly">
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
											<item.icon className="w-4 h-4" />
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

							<div className="flex items-end h-full">
								<Button onClick={openProjectModal} variant="grey" className="font-medium text-primary">
									<Plus size={15} /> <span>{t('pages.projects.CREATE_NEW_PROJECT')}</span>
								</Button>
							</div>
						</div>
					</div>
				</Container>
			}
		>
			<Container fullWidth={fullWidth} className="flex flex-col w-full h-full gap-6 p-4 mt-6 dark:bg-dark--theme">
				<div className="p-3 space-y-6 border rounded-lg bg-light--theme-light dark:bg-transparent">
					<div className="flex items-center justify-between font-light rounded ">
						<div className="w-80 flex border dark:border-white   h-[2.2rem] items-center px-4 rounded-lg">
							<Search size={15} className=" text-slate-300" />{' '}
							<InputField
								onChange={(e) => setSearchTerm(e.target.value)}
								value={searchTerm}
								placeholder="Search ..."
								className="h-full bg-transparent border-none dark:bg-transparent"
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
							<ProjectExportMenu projects={filteredProjects} activeTeam={activeTeam} />
							{selectedView == 'LIST' && (
								<Menu as="div" className="relative inline-block text-left">
									<div>
										<Menu.Button>
											<Button
												type="button"
												className=" border-gray-200 !border hover:bg-slate-100 dark:border text-sm min-w-fit text-black h-[2.2rem] font-light hover:dark:bg-transparent"
												variant="outline"
											>
												<Settings2 size={15} /> <span>{t('common.VIEW')}</span>
											</Button>
										</Menu.Button>
									</div>
									<Transition
										as="div"
										enter="transition ease-out duration-100"
										enterFrom="transform opacity-0 scale-95"
										enterTo="transform opacity-100 scale-100"
										leave="transition ease-in duration-75"
										leaveFrom="transform opacity-100 scale-100"
										leaveTo="transform opacity-0 scale-95"
									>
										<Menu.Items className="absolute z-[999] right-0 mt-2 w-36 origin-top-right space-y-[1px] p-[1px]  rounded-md bg-white dark:bg-dark-lighter shadow-lg ring-1 ring-black/5 focus:outline-none">
											{Object.entries(tableColumnsVisibility).map(
												([column, isVisible]: [string, boolean]) => {
													return hidableColumnNames
														.filter((el) =>
															!showArchivedProjects ? el !== 'archivedAt' : el
														)
														.includes(column) ? (
														<Menu.Item key={column}>
															{({ active }) => (
																<button
																	onClick={() =>
																		setTableColumnsVisibility((prev) => ({
																			...prev,
																			[column]: !isVisible
																		}))
																	}
																	className={cn(
																		`${active && 'bg-primary/10'} rounded gap-2 group flex w-full items-center px-2 py-2 text-xs`
																	)}
																>
																	<div className="flex items-center justify-center w-5 h-full ">
																		{isVisible && <Check size={12} />}
																	</div>
																	<span className="capitalize">{column}</span>
																</button>
															)}
														</Menu.Item>
													) : null;
												}
											)}
										</Menu.Items>
									</Transition>
								</Menu>
							)}
						</div>
					</div>

					<div
						className={cn(
							'w-full transition-all flex items-center bg-slate-400/10 border rounded-md py-2 px-3',
							(selectedView == 'GRID' && Object.keys(selectedProjects).length > 0) ||
								(selectedView == 'LIST' && Object.keys(selectedProjects).length > 1)
								? 'h-[3.2rem]'
								: 'h-0 p-0 border-none'
						)}
					>
						<div
							className={cn(
								'h-full  overflow-hidden  items-center gap-6',
								(selectedView == 'GRID' && Object.keys(selectedProjects).length > 0) ||
									(selectedView == 'LIST' && Object.keys(selectedProjects).length > 1)
									? 'flex'
									: 'hidden'
							)}
						>
							<div className="flex items-center h-full gap-2">
								{selectedView == 'GRID' && (
									<Checkbox
										checked={
											Object.keys(selectedProjects).length > 0 &&
											Object.keys(selectedProjects).length == filteredProjects.length
										}
										className=" shrink-0"
										onCheckedChange={handleSelectAllProjects}
									/>
								)}
								<p className=" min-w-[10rem]">
									{Object.keys(selectedProjects).length > 0 &&
									Object.keys(selectedProjects).length == filteredProjects.length
										? `All projects (${filteredProjects.length})`
										: `${Object.keys(selectedProjects).length} projects selected`}
								</p>
							</div>
							<div
								className={cn(
									'h-full flex relative items-center gap-2 transition-all',
									isBulkAction ? ' bottom-[0%] ' : ' -bottom-[100%]'
								)}
							>
								<VerticalSeparator />

								{showArchivedProjects ? (
									isBulkAction ? (
										<button
											onClick={openBulkRestoreProjectsModal}
											className={` bg-[#E2E8F0] gap-2 group flex items-center rounded-md px-2 py-2 shrink-0 text-xs`}
										>
											<RotateCcw size={15} /> <span>{t('common.RESTORE')}</span>
										</button>
									) : null
								) : isBulkAction ? (
									<button
										onClick={openBulkArchiveProjectsModal}
										className={` bg-[#E2E8F0] cursor-pointer gap-2 group flex items-center rounded-md px-2 py-2 shrink-0 text-xs`}
									>
										<Archive size={15} /> <span>{t('common.ARCHIVE')}</span>
									</button>
								) : null}
							</div>
						</div>
					</div>
					{selectedView === 'LIST' ? (
						<ProjectsListView
							projects={filteredProjects}
							loading={getOrganizationProjectsLoading}
							columnVisibility={tableColumnsVisibility}
							selectedProjects={selectedProjects}
							setSelectedProjects={setSelectedProjects}
							onColumnVisibilityChange={setTableColumnsVisibility}
						/>
					) : selectedView === 'GRID' ? (
						<ProjectsGridView
							loading={getOrganizationProjectsLoading}
							projects={filteredProjects}
							selectedProjects={selectedProjects}
							setSelectedProjects={setSelectedProjects}
						/>
					) : null}
				</div>
				<FiltersCardModal closeModal={closeFiltersCardModal} open={isFiltersCardModalOpen} />
				<CreateProjectModal key={'create-project'} open={isProjectModalOpen} closeModal={closeProjectModal} />
				{isBulkAction && (
					<>
						<BulkArchiveProjectsModal
							key={`bulk-archive-project`}
							projectIds={Object.keys(selectedProjects)}
							open={isBulkArchiveProjectsModalOpen}
							closeModal={closeBulkArchiveProjectsModal}
						/>
						<BulkRestoreProjectsModal
							key={`bulk-restore-project`}
							projectIds={Object.keys(selectedProjects)}
							open={isBulkRestoreProjectsModalOpen}
							closeModal={closeBulkRestoreProjectsModal}
						/>
					</>
				)}
			</Container>
		</MainLayout>
	);
}

export default withAuthentication(PageComponent, { displayName: 'ProjectsPage' });
