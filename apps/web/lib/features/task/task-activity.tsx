'use client';

import { Card } from 'lib/components';
import React from 'react';
import { UserTaskActivity } from './activity/user-task-activity';
import { ITeamTask } from '@app/interfaces';
import { useTaskTimeSheets } from '@app/hooks/features/useTaskActivity';
import { groupByTime } from '@app/helpers/array-data';

import { clsxm } from '@app/utils';
import { ChevronDownIcon, ChevronUpIcon } from 'lib/components/svgs';

export function TaskActivity({ task }: { task: ITeamTask }) {
	const { getTaskTimesheets, taskTimesheets } = useTaskTimeSheets(task?.id);
	const [hidden, setHidden] = React.useState(true);

	// order activity arr by Time
	const groupedData = groupByTime(taskTimesheets);

	React.useEffect(() => {
		getTaskTimesheets();
	}, [task, getTaskTimesheets]);
	return (
		<Card
			className="w-full p-4 md:px-4 dark:bg-[#25272D] flex flex-col gap-6 border border-[#00000014] dark:border-[#26272C]"
			shadow="bigger"
		>
			<div className="flex justify-between items-center gap-5 py-2 border-b border-b-[#00000014] dark:border-b-[#7B8089]">
				<div className="flex items-center gap-2 my-2">
					<h4 className="text-base">{'Timesheet'}</h4>
				</div>

				<div className="flex items-center justify-end gap-2.5">
					<button onClick={() => setHidden((e) => !e)}>
						{hidden ? (
							<ChevronDownIcon className="h-4 w-4 stroke-[#293241] dark:stroke-white cursor-pointer" />
						) : (
							<ChevronUpIcon className="h-4 w-4 stroke-[#293241] dark:stroke-white cursor-pointer" />
						)}
					</button>
				</div>
			</div>
			<div className={clsxm('flex flex-col max-h-80 gap-3', hidden && ['hidden'])}>
				{groupedData.map((timesheet, i) => (
					<div
						key={i}
						className="shadow-lg rounded-lg p-4 bg-light dark:bg-dark border border-[#00000014] dark:border-[#26272C]"
					>
						<h3 className="text-base font-semibold py-2">{timesheet.date}</h3>
						{timesheet.items.map((item) => (
							<UserTaskActivity key={item.id} timesheet={item} />
						))}
					</div>
				))}
			</div>
		</Card>
	);
}
