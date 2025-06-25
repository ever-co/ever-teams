'use client';
import React from 'react';
import { UserTaskActivity } from '../../tasks/user-task-activity';
import { useTaskTimeSheets } from '@/core/hooks/tasks/use-task-activity';
import { groupByTime } from '@/core/lib/helpers/array-data';

import { clsxm } from '@/core/lib/utils';
import { ChevronDownIcon, ChevronUpIcon } from 'assets/svg';
import { EverCard } from '../../common/ever-card';
import { TTask } from '@/core/types/schemas/task/task.schema';

export function TaskActivity({ task }: { task: TTask }) {
	const { taskTimesheets } = useTaskTimeSheets(task?.id);
	const [hidden, setHidden] = React.useState(true);

	// order activity arr by Time
	// Type assertion needed due to React Query migration - TActivity vs IActivity compatibility
	const groupedData = groupByTime(taskTimesheets);

	// React Query in useTaskTimeSheets handles data fetching automatically
	// No manual getTaskTimesheets() call needed
	return (
		<EverCard
			className="w-full p-4 md:px-4 dark:bg-[#25272D] flex flex-col gap-6 border border-[#00000014] dark:border-[#26272C]"
			shadow="bigger"
		>
			<div className="flex justify-between items-center gap-5 py-2 border-b border-b-[#00000014] dark:border-b-[#7B8089]">
				<div className="flex gap-2 items-center mb-2">
					<h4 className="text-base font-semibold">{'Timesheet'}</h4>
				</div>

				<div className="flex items-center justify-end gap-2.5">
					<button onClick={() => setHidden((e) => !e)}>
						{hidden ? (
							<ChevronDownIcon className="h-4 w-4 text-[#293241] dark:text-white cursor-pointer" />
						) : (
							<ChevronUpIcon className="h-4 w-4 text-[#293241] dark:text-white cursor-pointer" />
						)}
					</button>
				</div>
			</div>
			<div className={clsxm('flex flex-col max-h-80 gap-3', hidden && ['hidden'])}>
				{groupedData.length < 1 ? (
					<p className="mx-auto">There is no Activity</p>
				) : (
					groupedData.map((timesheet, i) => (
						<div
							key={i}
							className="shadow-lg rounded-lg p-4 bg-light dark:bg-dark border border-[#00000014] dark:border-[#26272C]"
						>
							<h3 className="py-2 text-base font-semibold">{timesheet.date}</h3>
							{timesheet.items.map((item) => (
								<UserTaskActivity key={item.id} timesheet={item} />
							))}
						</div>
					))
				)}
			</div>
		</EverCard>
	);
}
