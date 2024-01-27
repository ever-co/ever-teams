'use client';

import { Card } from 'lib/components';
import React from 'react';
import { UserTaskActivity } from './activity/user-task-activity';
import { ITeamTask } from '@app/interfaces';
import { useTaskTimeSheets } from '@app/hooks/features/useTaskActivity';
import { groupByTime } from '@app/helpers/array-data';

export function TaskActivity({ task }: { task: ITeamTask }) {
	// get users tasks
	const { getTaskTimesheets, taskTimesheets } = useTaskTimeSheets(task?.id);
	// order activity arr by Time
	const groupedData = groupByTime(taskTimesheets);
	console.log(groupedData);

	React.useEffect(() => {
		getTaskTimesheets();
	}, [task, getTaskTimesheets]);
	return (
		<Card
			className="w-full p-4 md:px-4 dark:bg-[#25272D] flex flex-col gap-6 border border-[#00000014] dark:border-[#26272C]"
			shadow="bigger"
		>
			{/* TO DELETE: start */}
			<div className="shadow-lg rounded-lg p-4 bg-light dark:bg-dark border border-[#00000014] dark:border-[#26272C]">
				<h3 className="text-xl font-semibold py-2">{'05.01.2024'}</h3>
				<UserTaskActivity />
				<UserTaskActivity />
			</div>
			{/* TO DELETE: end */}
			{groupedData.map((timesheet, i) => (
				<div
					key={i}
					className="shadow-lg rounded-lg p-4 bg-light dark:bg-dark border border-[#00000014] dark:border-[#26272C]"
				>
					<h3 className="text-xl font-semibold py-2">{timesheet.date}</h3>
					{timesheet.items.map((item) => (
						<UserTaskActivity key={item.id} />
					))}
				</div>
			))}

			{/* TO DELETE: start */}
			<div className="shadow-lg rounded-lg p-4 bg-light dark:bg-dark border border-[#00000014] dark:border-[#26272C]">
				<h3 className="text-xl font-semibold py-2">{'03.01.2024'}</h3>
				<UserTaskActivity />
				<UserTaskActivity />
				<UserTaskActivity />
			</div>
			{/* TO DELETE: end */}
		</Card>
	);
}
