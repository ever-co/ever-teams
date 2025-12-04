'use client';

import { MainLayout } from '@/core/components/layouts/default-layout';
import { organizationProjectsState } from '@/core/stores';
import { useLocalStorageState, useModal, useOrganizationProjects } from '@/core/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
// dynamic import removed - using optimized components
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
import { isValidProjectForDisplay, projectBelongsToTeam } from '@/core/lib/helpers/type-guards';
import { Button, Container } from '@/core/components';
import { DatePickerWithRange } from '@/core/components/common/date-range-select';
import { DateRange } from 'react-day-picker';
import { LAST_SELECTED_PROJECTS_VIEW } from '@/core/constants/config/constants';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { VisibilityState } from '@tanstack/react-table';
import { ProjectViewDataType } from './project-views';
import { Menu, Transition } from '@headlessui/react';
import { hidableColumnNames } from './project-views/list-view/data-table';
import { Checkbox } from '@/core/components/common/checkbox';

import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import { useParams } from 'next/navigation';
import { Breadcrumb } from '../../duplicated-components/breadcrumb';
import { InputField } from '../../duplicated-components/_input';
import { VerticalSeparator } from '../../duplicated-components/separator';

import { TOrganizationProject } from '@/core/types/schemas';
// Skeletons now handled by optimized components
import { ModalSkeleton } from '../../common/skeleton/modal-skeleton';

// Import optimized components from centralized location
import {
	LazyFiltersCardModal,
	LazyCreateProjectModal,
	LazyBulkArchiveProjectsModal,
	LazyBulkRestoreProjectsModal,
	LazyProjectsListView,
	LazyProjectsGridView,
	LazyProjectExportMenu
} from '@/core/components/optimized-components/projects';
import { activeTeamState, isTrackingEnabledState, organizationTeamsState } from '@/core/stores';
import { workspacesState } from '@/core/stores/auth/workspaces';

type TViewMode = 'GRID' | 'LIST';

function PageComponent() {
	const t = useTranslations();
	const {
		isOpen: isFiltersCardModalOpen,
		closeModal: closeFiltersCardModal,
		openModal: openFiltersCardModal
	} = useModal();
	const { isOpen: isProjectModalOpen, closeModal: closeProjectModal, openModal: openProjectModal } = useModal();

	const activeTeam = useAtomValue(activeTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const [selectedView, setSelectedView] = useLocalStorageState<TViewMode>(LAST_SELECTED_PROJECTS_VIEW, 'LIST');
	const [projects, setProjects] = useState<ProjectViewDataType[]>([]);

	const fullWidth = useAtomValue(fullWidthState);
	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl?.locale;
	const organizationProjects = useAtomValue(organizationProjectsState);
	const organizationTeams = useAtomValue(organizationTeamsState);
	const workspaces = useAtomValue(workspacesState);

	const { getOrganizationProjectsLoading, setSearchQueries } = useOrganizationProjects();
	const [searchTerm, setSearchTerm] = useState('');
	const params = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const showArchivedProjects = Boolean(params.get('archived'));

	// Read filters from URL parameters (set by LazyFiltersCardModal)
	const urlFilters = useMemo(() => {
		const teamsParam = params.get('teams');
		const membersParam = params.get('members');
		const managersParam = params.get('managers');
		const statusParam = params.get('status');
		const budgetTypesParam = params.get('budgetTypes');

		return {
			teams: teamsParam ? teamsParam.split(',').filter(Boolean) : [],
			members: membersParam ? membersParam.split(',').filter(Boolean) : [],
			managers: managersParam ? managersParam.split(',').filter(Boolean) : [],
			status: statusParam ? statusParam.split(',').filter(Boolean) : [],
			budgetTypes: budgetTypesParam ? budgetTypesParam.split(',').filter(Boolean) : []
		};
	}, [params]);

	// Initialize date range from URL parameters only - no default filter
	// Date filter should only apply when user explicitly selects a date range
	const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
		const dateFromParam = params.get('dateFrom');
		const dateToParam = params.get('dateTo');

		if (dateFromParam && dateToParam) {
			return {
				from: new Date(dateFromParam),
				to: new Date(dateToParam)
			};
		}

		return undefined; // No default date filter - show all projects
	});

	// Sync dateRange state with URL params (for when "Clear All" is clicked in filters modal)
	useEffect(() => {
		const dateFromParam = params.get('dateFrom');
		const dateToParam = params.get('dateTo');

		if (dateFromParam && dateToParam) {
			setDateRange({
				from: new Date(dateFromParam),
				to: new Date(dateToParam)
			});
		} else {
			setDateRange(undefined);
		}
	}, [params]);

	// Count active filters (including date range)
	const activeFiltersCount = useMemo(() => {
		let count = 0;
		if (urlFilters.teams.length > 0) count++;
		if (urlFilters.members.length > 0) count++;
		if (urlFilters.managers.length > 0) count++;
		if (urlFilters.status.length > 0) count++;
		if (urlFilters.budgetTypes.length > 0) count++;
		if (dateRange?.from && dateRange?.to) count++;
		return count;
	}, [urlFilters, dateRange]);
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

	// Function to update URL with date parameters
	const updateDateInURL = useCallback(
		(newDateRange: DateRange) => {
			const newParams = new URLSearchParams(params.toString());

			if (newDateRange.from && newDateRange.to) {
				newParams.set('dateFrom', newDateRange.from.toISOString().split('T')[0]);
				newParams.set('dateTo', newDateRange.to.toISOString().split('T')[0]);
			} else {
				newParams.delete('dateFrom');
				newParams.delete('dateTo');
			}

			router.push(`${pathname}?${newParams.toString()}`);
		},
		[params, router, pathname]
	);

	const mapProjectToViewDataType = useCallback((project: TOrganizationProject): ProjectViewDataType => {
		return {
			project: {
				name: project.name,
				imageUrl: project.imageUrl,
				color: project.color,
				id: project.id
			},
			status: project.status,
			archivedAt: project.archivedAt || null,
			isArchived: project.isArchived,
			startDate: project.startDate || undefined,
			endDate: project.endDate || undefined,
			createdAt: project.createdAt,
			members: project.members,
			managers: project.members?.filter((member) => member.isManager) || [],
			teams: project.teams
		};
	}, []);

	// Filter projects by date range
	const dateFilteredProjects = useMemo(() => {
		if (!projects || projects.length === 0) {
			return [];
		}

		// If no date range is set, return all projects
		if (!dateRange?.from || !dateRange?.to) {
			return projects;
		}

		const rangeStart = new Date(dateRange.from);
		const rangeEnd = new Date(dateRange.to);
		// Set rangeEnd to end of day for inclusive comparison
		rangeEnd.setHours(23, 59, 59, 999);

		return projects.filter((project) => {
			const projectStartDate = project.startDate ? new Date(project.startDate) : null;
			const projectEndDate = project.endDate ? new Date(project.endDate) : null;
			const projectCreatedAt = project.createdAt ? new Date(project.createdAt) : null;

			// Check if dates are invalid (1970-01-01 means no real date set)
			const isStartDateInvalid = projectStartDate && projectStartDate.getFullYear() === 1970;
			const isEndDateInvalid = projectEndDate && projectEndDate.getFullYear() === 1970;

			// Get valid dates (excluding 1970 epoch dates)
			const validStartDate = projectStartDate && !isStartDateInvalid ? projectStartDate : null;
			const validEndDate = projectEndDate && !isEndDateInvalid ? projectEndDate : null;

			// Case 1: Project has both valid start and end dates - check overlap
			if (validStartDate && validEndDate) {
				return validStartDate <= rangeEnd && validEndDate >= rangeStart;
			}

			// Case 2: Project has only valid start date
			if (validStartDate && !validEndDate) {
				return validStartDate >= rangeStart && validStartDate <= rangeEnd;
			}

			// Case 3: Project has only valid end date
			if (!validStartDate && validEndDate) {
				return validEndDate >= rangeStart && validEndDate <= rangeEnd;
			}

			// Case 4: No valid project dates - fallback to createdAt
			if (projectCreatedAt) {
				return projectCreatedAt >= rangeStart && projectCreatedAt <= rangeEnd;
			}

			// No dates at all - exclude from filtered results when date filter is active
			return false;
		});
	}, [projects, dateRange]);

	const activeTeamProjects = useMemo(() => {
		// If no active team, return no projects
		if (!activeTeam?.id) {
			return [];
		}

		// Only show projects that belong to the active team
		return (
			dateFilteredProjects?.filter((el) => {
				return projectBelongsToTeam(el, activeTeam.id);
			}) || []
		);
	}, [activeTeam, dateFilteredProjects]);

	// Apply URL filters (from LazyFiltersCardModal) to projects
	const urlFilteredProjects = useMemo(() => {
		if (!activeTeamProjects || activeTeamProjects.length === 0) {
			return [];
		}

		const { teams, members, managers, status, budgetTypes } = urlFilters;

		// If no filters are active, return all projects
		if (
			teams.length === 0 &&
			members.length === 0 &&
			managers.length === 0 &&
			status.length === 0 &&
			budgetTypes.length === 0
		) {
			return activeTeamProjects;
		}

		return activeTeamProjects.filter((project) => {
			// Filter by teams: project must belong to at least one of the selected teams
			if (teams.length > 0) {
				const projectTeamIds = project.teams?.map((team) => team?.id).filter(Boolean) || [];
				const hasMatchingTeam = teams.some((teamId) => projectTeamIds.includes(teamId));
				if (!hasMatchingTeam) return false;
			}

			// Filter by members: project must have at least one of the selected members (non-managers)
			if (members.length > 0) {
				const projectMemberIds =
					project.members
						?.filter((member) => !member?.isManager)
						?.map((member) => member?.employeeId)
						.filter(Boolean) || [];
				const hasMatchingMember = members.some((memberId) => projectMemberIds.includes(memberId));
				if (!hasMatchingMember) return false;
			}

			// Filter by managers: project must have at least one of the selected managers
			if (managers.length > 0) {
				const projectManagerIds = project.managers?.map((manager) => manager?.employeeId).filter(Boolean) || [];
				const hasMatchingManager = managers.some((managerId) => projectManagerIds.includes(managerId));
				if (!hasMatchingManager) return false;
			}

			// Filter by status: project status must match one of the selected statuses
			if (status.length > 0) {
				// Get the original project to access status ID
				const originalProject = organizationProjects.find((p) => p.id === project.project?.id);
				// Status in URL is stored as status ID (from taskStatuses)
				// But project.status is the status name, so we need to match by name or ID
				const projectStatus = originalProject?.status;
				if (!projectStatus || !status.includes(projectStatus)) {
					// Try matching by checking if any status filter matches the project status
					const hasMatchingStatus = status.some((statusFilter) => projectStatus === statusFilter);
					if (!hasMatchingStatus) return false;
				}
			}

			// Filter by budget types: project budgetType must match one of the selected budget types
			if (budgetTypes.length > 0) {
				const originalProject = organizationProjects.find((p) => p.id === project.project?.id);
				const projectBudgetType = originalProject?.budgetType;
				if (!projectBudgetType || !budgetTypes.includes(projectBudgetType)) return false;
			}

			return true;
		});
	}, [activeTeamProjects, urlFilters, organizationProjects]);

	const filteredProjects = useMemo(() => {
		const result = searchTerm
			? urlFilteredProjects.filter((el) =>
					el.project?.name?.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase())
				)
			: urlFilteredProjects;

		return result || [];
	}, [urlFilteredProjects, searchTerm]);
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

	// Main effect for filtering projects based on archived status
	// Uses the same filtering logic as ProjectDropDown for consistency
	useEffect(() => {
		if (!organizationProjects || organizationProjects.length === 0) {
			setProjects([]);
			return;
		}

		// Filter valid projects using isValidProjectForDisplay type-guard
		// This ensures we only show REAL projects (not Teams or other entities)
		// IMPORTANT: isActive alone is NOT sufficient - we MUST use isProject() type guard
		const validProjects = organizationProjects.filter((project) =>
			isValidProjectForDisplay(project, showArchivedProjects)
		);

		// Map to view data type
		const mappedProjects = validProjects.map(mapProjectToViewDataType);
		setProjects(mappedProjects);
	}, [organizationProjects, showArchivedProjects]);

	// Separate effect for handling member queries (if needed)
	useEffect(() => {
		const members = [...(params.get('managers')?.split(',') ?? []), ...(params.get('members')?.split(',') ?? [])];

		const queries = {
			...(members.length > 0 && {
				'where[members][employeeId]': members[0]
			})
		};

		if (Object.keys(queries).length > 0) {
			setSearchQueries(queries);
			setSelectedProjects({}); // Reset projects selection
		}
	}, [params]);

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
		const areAllProjectsSelected = Object.keys(selectedProjects).length === filteredProjects.length;
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
			className="p-0! pb-1 overflow-hidden! w-full"
			childrenClassName="w-full h-full"
			mainHeaderSlot={
				<Container fullWidth={fullWidth} className="flex flex-col p-4 dark:bg-dark--theme">
					<div className="flex items-center w-full">
						<button onClick={handleBack} className="p-1 rounded-full transition-colors hover:bg-gray-100">
							<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
						</button>
						<Breadcrumb paths={breadcrumbPath} className="text-sm" />
					</div>
					<div className="flex flex-col gap-3 justify-between items-start">
						<div className="flex gap-8 justify-center items-center h-10">
							<h3 className="text-3xl font-medium">{t('pages.projects.projectTitle.PLURAL')}</h3>
						</div>
						<div className="flex justify-between items-center w-full h-14">
							<div className="w-[20rem] h-full flex items-end justify-center">
								<ul className="flex relative justify-evenly w-full text-lg">
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
			<Container fullWidth={fullWidth} className="flex flex-col gap-6 p-4 mt-6 w-full h-full dark:bg-dark--theme">
				<div className="p-3 space-y-6 rounded-lg border bg-light--theme-light dark:bg-transparent">
					<div className="flex justify-between items-center font-light rounded">
						<div className="w-80 flex border dark:border-white h-[2.2rem] items-center px-4 rounded-lg">
							<Search size={15} className="text-slate-300" />{' '}
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
								onChange={(newDateRange: DateRange) => {
									setDateRange(newDateRange);
									updateDateInURL(newDateRange);
								}}
								className="bg-transparent dark:bg-transparent dark:border-white"
							/>
							<Button
								onClick={openFiltersCardModal}
								type="button"
								className="relative border-gray-200 !border hover:bg-slate-100 dark:border text-sm min-w-fit text-black h-[2.2rem] font-light hover:dark:bg-transparent"
								variant="outline"
							>
								<ListFilterPlus size={15} /> <span>{t('common.FILTER')}</span>
								{activeFiltersCount > 0 && (
									<span className="flex absolute -top-2 -right-2 justify-center items-center w-5 h-5 text-xs font-medium text-white rounded-full bg-primary">
										{activeFiltersCount}
									</span>
								)}
							</Button>
							<LazyProjectExportMenu projects={filteredProjects} activeTeam={activeTeam} />
							{selectedView == 'LIST' && (
								<Menu as="div" className="inline-block relative text-left">
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
																		`${active && 'bg-primary/10'} rounded-sm gap-2 group flex w-full items-center px-2 py-2 text-xs`
																	)}
																>
																	<div className="flex justify-center items-center w-5 h-full">
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
							<div className="flex gap-2 items-center h-full">
								{selectedView == 'GRID' && (
									<Checkbox
										checked={
											Object.keys(selectedProjects).length > 0 &&
											Object.keys(selectedProjects).length == filteredProjects.length
										}
										className="shrink-0"
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
						<LazyProjectsListView
							projects={filteredProjects}
							loading={getOrganizationProjectsLoading}
							columnVisibility={tableColumnsVisibility}
							selectedProjects={selectedProjects}
							setSelectedProjects={setSelectedProjects}
							onColumnVisibilityChange={setTableColumnsVisibility}
						/>
					) : (
						<LazyProjectsGridView
							projects={filteredProjects}
							loading={getOrganizationProjectsLoading}
							selectedProjects={selectedProjects}
							setSelectedProjects={setSelectedProjects}
						/>
					)}
				</div>
				{isFiltersCardModalOpen && (
					<Suspense fallback={<ModalSkeleton />}>
						<LazyFiltersCardModal closeModal={closeFiltersCardModal} open={isFiltersCardModalOpen} />
					</Suspense>
				)}
				{isProjectModalOpen && (
					<Suspense fallback={<ModalSkeleton />}>
						<LazyCreateProjectModal
							key={'create-project'}
							open={isProjectModalOpen}
							closeModal={closeProjectModal}
						/>
					</Suspense>
				)}
				{/* Lazy loaded bulk action modals with conditional rendering */}
				{isBulkAction && isBulkArchiveProjectsModalOpen && (
					<Suspense fallback={<ModalSkeleton />}>
						<LazyBulkArchiveProjectsModal
							key={`bulk-archive-project`}
							projectIds={Object.keys(selectedProjects)}
							open={isBulkArchiveProjectsModalOpen}
							closeModal={closeBulkArchiveProjectsModal}
						/>
					</Suspense>
				)}
				{isBulkAction && isBulkRestoreProjectsModalOpen && (
					<Suspense fallback={<ModalSkeleton />}>
						<LazyBulkRestoreProjectsModal
							key={`bulk-restore-project`}
							projectIds={Object.keys(selectedProjects)}
							open={isBulkRestoreProjectsModalOpen}
							closeModal={closeBulkRestoreProjectsModal}
						/>
					</Suspense>
				)}
			</Container>
		</MainLayout>
	);
}

export default withAuthentication(PageComponent, { displayName: 'ProjectsPage' });
