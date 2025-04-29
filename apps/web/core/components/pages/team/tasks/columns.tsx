import { ITeamTask } from '@/app/interfaces';
import { ColumnDef } from '@tanstack/react-table';
import { Bug } from 'lucide-react';
import AssigneeUser from './AssigneeUser';
import { ActiveTaskStatusDropdown } from '@/core/components/features';
import DropdownMenuTask from './DropdownMenuTask';

// Columns that can be hidden in the team tasks table
export const hidableColumnNames = ['type_and_number', 'assignee', 'status', 'teams'];

export const columns: ColumnDef<ITeamTask>[] = [
	{
		accessorKey: 'typeNumber',
		header: 'Type + Number',
		id: 'type_and_number',
		cell: ({ row }) => (
			<div className="flex items-center h-full gap-2.5">
				{row.original.issueType ? (
					<>
						<span
							className={`w-5 h-5 rounded-full flex items-center justify-center ${
								row.original.issueType === 'Bug'
									? 'bg-red-500'
									: row.original.issueType === 'Story'
										? 'bg-orange-400'
										: 'bg-green-400'
							}`}
						>
							{row.original.issueType === 'Bug' ? (
								<Bug className="w-3 h-3 text-white" />
							) : row.original.issueType === 'Story' ? (
								<svg
									width={12}
									height={12}
									className="w-3 h-3 text-white"
									viewBox="0 0 10 10"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M3.45824 7.5167V7.03337C2.4999 6.4542 1.7124 5.32503 1.7124 4.12503C1.7124 2.06253 3.60824 0.445866 5.7499 0.912532C6.69157 1.12087 7.51657 1.74587 7.94574 2.60837C8.81657 4.35837 7.8999 6.2167 6.55407 7.0292V7.51253C6.55407 7.63337 6.5999 7.91253 6.15407 7.91253H3.85824C3.3999 7.9167 3.45824 7.73753 3.45824 7.5167Z"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M3.54175 9.16663C4.49591 8.89579 5.50425 8.89579 6.45841 9.16663"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							) : (
								<svg
									className="w-3 h-3 text-white"
									width={12}
									height={12}
									viewBox="0 0 10 10"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M5.15405 3.69995H7.34155"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M2.65845 3.69995L2.97095 4.01245L3.90845 3.07495"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M5.15405 6.6167H7.34155"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M2.65845 6.6167L2.97095 6.9292L3.90845 5.9917"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M3.74992 9.16671H6.24992C8.33325 9.16671 9.16659 8.33337 9.16659 6.25004V3.75004C9.16659 1.66671 8.33325 0.833374 6.24992 0.833374H3.74992C1.66659 0.833374 0.833252 1.66671 0.833252 3.75004V6.25004C0.833252 8.33337 1.66659 9.16671 3.74992 9.16671Z"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							)}
						</span>

						<span className="text-sm font-medium text-[#BAB8C4] dark:text-stone-300">
							#{row.original.number}
						</span>
					</>
				) : (
					<span className="text-sm font-medium text-[#BAB8C4] dark:text-stone-300">No issue Type</span>
				)}
			</div>
		)
	},
	{
		accessorKey: 'title',
		header: 'Title',
		id: 'title',
		cell: ({ row }) => (
			<div className="text-sm font-medium text-indigo-950 dark:text-gray-200">{row.original.title}</div>
		),
		enableColumnFilter: true
	},
	{
		accessorKey: 'user',
		header: 'Assignee',
		id: 'assignee',
		cell: ({ row }) => <AssigneeUser users={row.original.members} />
	},
	{
		accessorKey: 'status',
		header: 'Status',
		id: 'status',
		cell: ({ row }) => (
			<ActiveTaskStatusDropdown
				task={row.original}
				defaultValue={row.original.status}
				className="lg:max-w-[190px] w-full"
				taskStatusClassName="text-xs py-1.5 w-full"
			/>
		)
	},
	{
		id: 'actions',
		header: 'Action',
		cell: ({ row }) => {
			return <DropdownMenuTask task={row.original} />;
		}
	}
];
