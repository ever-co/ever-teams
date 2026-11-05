import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ColumnDef } from '@tanstack/react-table';
import AssigneeUser from './assignee-user';
import DropdownMenuTask from './dropdown-menu-task';
import { ActiveTaskStatusDropdown } from '@/core/components/tasks/task-status';
import { TaskIssueStatus } from '@/core/components/tasks/task-issue';
import { TTask } from '@/core/types/schemas/task/task.schema';

// Columns that can be hidden in the team tasks table
export const hidableColumnNames = ['type_and_number', 'assignee', 'status', 'teams'];

export function useTaskColumns(): ColumnDef<TTask>[] {
	const t = useTranslations();

	return useMemo<ColumnDef<TTask>[]>(
		() => [
			{
				accessorKey: 'typeNumber',
				header: t('pages.teamTasks.TYPE_AND_NUMBER'),
				id: 'type_and_number',
				cell: ({ row }) => {
					const hasIssueType = Boolean(row.original.issueType);
					return (
						<div className="flex h-full items-center gap-2.5">
							{hasIssueType && (
								<>
									<TaskIssueStatus task={row.original} showIssueLabels={false} className="shrink-0" />

									<span className="text-sm tabular-nums text-muted-foreground">
										#{row.original.number}
									</span>
								</>
							)}
							{!hasIssueType && (
								<span className="text-sm font-medium text-muted-foreground">
									{t('pages.teamTasks.NO_ISSUE_TYPE')}
								</span>
							)}
						</div>
					);
				}
			},
			{
				accessorKey: 'title',
				header: t('common.TITLE'),
				id: 'title',
				cell: ({ row }) => (
					<div className="min-w-80 max-w-96 truncate text-sm font-medium text-foreground">
						{row.original.title}
					</div>
				),
				enableColumnFilter: true
			},
			{
				accessorKey: 'user',
				header: t('common.ASSIGNEE'),
				id: 'assignee',
				cell: ({ row }) => <AssigneeUser users={row.original.members} />
			},
			{
				accessorKey: 'status',
				header: t('common.STATUS'),
				id: 'status',
				cell: ({ row }) => (
					<ActiveTaskStatusDropdown
						task={row.original}
						defaultValue={row.original.status ?? undefined}
						className="lg:max-w-[190px] w-full"
						taskStatusClassName="text-xs py-1.5 w-full"
					/>
				)
			},
			{
				id: 'actions',
				header: t('common.ACTION'),
				cell: ({ row }) => {
					return <DropdownMenuTask task={row.original} />;
				}
			}
		],
		[t]
	);
}
