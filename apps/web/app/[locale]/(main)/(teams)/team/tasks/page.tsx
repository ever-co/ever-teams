'use client';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { getCoreRowModel, getFilteredRowModel, useReactTable, VisibilityState } from '@tanstack/react-table';
import { cn, getStatusColor } from '@/core/lib/helpers';
import { Input } from '@/core/components/common/input';
import { Check, Search, Settings2 } from 'lucide-react';
import { usePagination } from '@/core/hooks/common/use-pagination';
import { Menu, Transition } from '@headlessui/react';
import { columns, hidableColumnNames } from '@/core/components/pages/teams/team/tasks/columns';
import StatusBadge from '@/core/components/pages/teams/team/tasks/status-badge';
import { TaskTable } from '@/core/components/pages/teams/team/tasks/task-table';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { Paginate } from '@/core/components/duplicated-components/_pagination';
import { Button } from '@/core/components/duplicated-components/_button';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { ColumnDef } from '@tanstack/react-table';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TeamTasksPageSkeleton } from '@/core/components/layouts/skeletons/team-tasks-page-skeleton';
import { activeTeamState, tasksByTeamState } from '@/core/stores';

const TeamTask = () => {
	const t = useTranslations();
	const params = useParams<{ locale: string }>();
	const fullWidth = useAtomValue(fullWidthState);
	const currentLocale = params ? params.locale : null;

	const activeTeam = useAtomValue(activeTeamState);
	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: "Team's Task", href: `/${currentLocale}/team/task` }
		],
		[activeTeam?.name, currentLocale, t]
	);

	const tasks = useAtomValue(tasksByTeamState);
	const [searchTaskTerm, setSearchTaskTerm] = useState('');
	const filteredTasks = useMemo(
		() => tasks.filter((el) => el.title.toLowerCase().includes(searchTaskTerm.toLowerCase())),
		[searchTaskTerm, tasks]
	);

	const [tableColumnsVisibility, setTableColumnsVisibility] = useState<VisibilityState>({
		type_and_number: true,
		issueTitle: true,
		assignee: true,
		status: true,
		action: true
	});

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems, pageCount } =
		usePagination<TTask>({ items: filteredTasks, defaultItemsPerPage: 5 });
	useReactTable<TTask>({
		data: currentItems,
		columns: columns as ColumnDef<TTask, any>[],
		state: {
			columnVisibility: tableColumnsVisibility
		},
		getRowId: (row) => row.id.toString(),

		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	});

	// COMPLETE PAGE SKELETON: Show unified skeleton while initial data is loading
	// IMPORTANT: This must be AFTER all hooks to avoid "Rendered fewer hooks than expected" error
	if (!activeTeam || !tasks) {
		return <TeamTasksPageSkeleton fullWidth={fullWidth} />;
	}

	return (
		<MainLayout
			mainHeaderSlot={
				<Container fullWidth={fullWidth} className="mt-5">
					<Breadcrumb paths={breadcrumbPath} className="mb-5 text-sm" />

					<div className="flex flex-col my-4 leading-snug">
						<div className="flex flex-wrap gap-10 justify-between items-center w-full max-md:max-w-full">
							<h1 className="self-stretch my-auto text-4xl font-medium text-indigo-950 dark:text-gray-50">
								{t('sidebar.TEAMTASKS')}
							</h1>
							<nav className="flex flex-wrap gap-3.5 items-center self-stretch my-auto text-sm font-medium min-w-[240px] text-indigo-950 max-md:max-w-full">
								<div className="flex gap-2.5 justify-center items-center self-stretch my-auto font-medium text-slate-800">
									<div className="flex gap-1 items-start self-stretch my-auto">
										{Array.from(new Set(currentItems.map((status) => status.status))).map(
											(taskStatus, index) => (
												<StatusBadge
													key={index}
													color={getStatusColor(taskStatus as ETaskStatusName)}
													label={taskStatus?.split('-').join(' ') || ''}
													count={tasks.filter((item) => item.status === taskStatus).length}
												/>
											)
										)}
									</div>
								</div>
								{/* <FilterButton table={table} /> */}
								<Menu as="div" className="inline-block relative text-left">
									<div>
										<Menu.Button>
											<Button
												type="button"
												className=" border-gray-200 !border hover:bg-slate-100 dark:border text-sm min-w-fit text-black h-[2.2rem] hover:dark:bg-transparent"
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
											{Object.entries(tableColumnsVisibility).map(([column, isVisible]) => {
												return hidableColumnNames.includes(column) ? (
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
																<div className="flex justify-center items-center w-5 h-full">
																	{isVisible && <Check size={12} />}
																</div>
																<span className="capitalize">
																	{column == 'type_and_number'
																		? 'Type + Number'
																		: column}
																</span>
															</button>
														)}
													</Menu.Item>
												) : null;
											})}
										</Menu.Items>
									</Transition>
								</Menu>
								<div className="w-px h-6 bg-gray-200 dark:bg-gray-400" />
								<div className="flex gap-2.5 items-center relative min-w-[122px] text-muted-foreground border border-gray-200 dark:border-gray-400 rounded-md">
									<Search className="absolute left-3 w-4 h-4" />

									<Input
										placeholder="Search tasks..."
										value={searchTaskTerm}
										onChange={(event) => {
											setSearchTaskTerm(event.target.value);
										}}
										className="max-w-sm pl-10 bg-transparent border-none dark:focus-visible:!border-[#c8c8c8] transition-all duration-200  placeholder:font-normal"
									/>
								</div>
								<Button
									className="text-[#B1AEBC]"
									variant="ghost"
									size="icon"
									aria-label="More options"
								>
									<svg
										className="w-4 h-4"
										width={24}
										height={24}
										viewBox="0 0 24 24"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10Z"
											stroke="currentColor"
											strokeWidth="1.3"
										/>
										<path
											d="M19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10Z"
											stroke="currentColor"
											strokeWidth="1.3"
										/>
										<path
											d="M12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"
											stroke="currentColor"
											strokeWidth="1.3"
										/>
									</svg>
								</Button>
							</nav>
						</div>
					</div>
				</Container>
			}
			childrenClassName="bg-white dark:bg-dark--theme"
		>
			<div className="flex flex-col p-4 pt-6 w-full min-h-full">
				<TaskTable columnVisibility={tableColumnsVisibility} currentItems={currentItems} />

				<Paginate
					total={total}
					onPageChange={onPageChange}
					pageCount={pageCount}
					itemsPerPage={itemsPerPage}
					itemOffset={itemOffset}
					endOffset={endOffset}
					setItemsPerPage={setItemsPerPage}
					className="mt-auto"
				/>
			</div>
		</MainLayout>
	);
};

export default withAuthentication(TeamTask, { displayName: 'TeamTask' });
