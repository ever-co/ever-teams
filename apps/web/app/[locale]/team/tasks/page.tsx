'use client';
import { Breadcrumb, Container, Paginate } from 'lib/components';
import { MainLayout } from 'lib/layout';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';

import { fullWidthState } from '@app/stores/fullWidth';

import { useOrganizationTeams, useTeamTasks } from '@app/hooks';
import { withAuthentication } from '@/lib/app/authenticator';
import { ITeamTask } from '@/app/interfaces';

import { getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table';
import StatusBadge from '@components/pages/team/tasks/StatusBadge';
import { getStatusColor } from '@/lib/utils';
import FilterButton from '@components/pages/team/tasks/FilterButton';
import { Input } from '@components/ui/input';
import { Search } from 'lucide-react';
import { Button } from '@components/ui/button';
import { TaskTable } from '@components/pages/team/tasks/TaskTable';
import { columns } from '@components/pages/team/tasks/columns';
import { usePagination } from '@/app/hooks/features/usePagination';
const TeamTask = () => {
	const t = useTranslations();
	const params = useParams<{ locale: string }>();
	const fullWidth = useAtomValue(fullWidthState);
	const currentLocale = params ? params.locale : null;
	const { activeTeam } = useOrganizationTeams();
	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: "Team's Task", href: `/${currentLocale}/team/task` }
		],
		[activeTeam?.name, currentLocale, t]
	);

	const { tasks } = useTeamTasks();

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<ITeamTask>(tasks);
	const table = useReactTable<ITeamTask>({
		data: currentItems,
		columns,

		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	});

	return (
		<MainLayout
			mainHeaderSlot={
				<Container fullWidth={fullWidth} className="mt-16">
					<Breadcrumb paths={breadcrumbPath} className="mb-10 text-sm" />

					<div className="flex flex-col my-5 leading-snug">
						<div className="flex flex-wrap items-center justify-between w-full gap-10 py-2 max-md:max-w-full">
							<h1 className="self-stretch my-auto text-4xl font-medium tracking-tighter text-indigo-950 dark:text-gray-50">
								{t('sidebar.TEAMTASKS')}
							</h1>
							<nav className="flex flex-wrap gap-3.5 items-center self-stretch my-auto text-sm font-medium tracking-tight min-w-[240px] text-indigo-950 max-md:max-w-full">
								<div className="flex gap-2.5 justify-center items-center self-stretch my-auto font-medium text-slate-800">
									<div className="flex items-start self-stretch gap-1 my-auto">
										{Array.from(new Set(currentItems.map((status) => status.status))).map(
											(taskStatus, index) => (
												<StatusBadge
													key={index}
													color={getStatusColor(taskStatus)}
													label={taskStatus.split('-').join(' ')}
													count={tasks.filter((item) => item.status === taskStatus).length}
												/>
											)
										)}
									</div>
								</div>
								<FilterButton table={table} />
								<div className="w-px h-6 bg-gray-200 dark:bg-gray-400" />
								<div className="flex gap-2.5 items-center relative min-w-[122px] text-muted-foreground border border-gray-200 dark:border-gray-400 rounded-md">
									<Search className="absolute w-4 h-4 left-3" />

									<Input
										placeholder="Search tasks..."
										value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
										onChange={(event) =>
											table.getColumn('title')?.setFilterValue(event.target.value)
										}
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
			<div className="flex flex-col w-full min-h-full p-4 pt-6">
				<TaskTable currentItems={currentItems} />

				<Paginate
					total={total}
					onPageChange={onPageChange}
					pageCount={1} // Set Static to 1 - It will be calculated dynamically in Paginate component
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
