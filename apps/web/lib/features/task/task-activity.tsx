'use client';

import { Card } from 'lib/components';
import React from 'react';
import { UserTaskActivity } from './activity/user-task-activity';
import { ITeamTask } from '@app/interfaces';
import { useTaskTimeSheets } from '@app/hooks/features/useTaskActivity';

export function TaskActivity({ task }: { task: ITeamTask }) {
	// get users tasks
	const { getTaskTimesheets, taskTimesheets } = useTaskTimeSheets(task?.id);
	const users = task ? task.members : [];
	console.log(users, taskTimesheets);
	// filters user Task and get This one
	// push to activity arr
	// order activity arr by Time

	React.useEffect(() => {
		console.log('FETCH TIMESHEETS');
		getTaskTimesheets();
	}, [task, getTaskTimesheets]);
	return (
		<Card
			className="w-full p-4 md:px-4 dark:bg-[#25272D] flex flex-col gap-6 border border-[#00000014] dark:border-[#26272C]"
			shadow="bigger"
		>
			<div className="shadow-lg rounded-lg p-4 bg-light dark:bg-dark border border-[#00000014] dark:border-[#26272C]">
				<h3 className="text-xl font-semibold py-2">{'05.01.2024'}</h3>
				<UserTaskActivity />
				<UserTaskActivity />
			</div>

			<div className="shadow-lg rounded-lg p-4 bg-light dark:bg-dark border border-[#00000014] dark:border-[#26272C]">
				<h3 className="text-xl font-semibold py-2">{'04.01.2024'}</h3>
				<UserTaskActivity />
			</div>

			<div className="shadow-lg rounded-lg p-4 bg-light dark:bg-dark border border-[#00000014] dark:border-[#26272C]">
				<h3 className="text-xl font-semibold py-2">{'03.01.2024'}</h3>
				<UserTaskActivity />
				<UserTaskActivity />
				<UserTaskActivity />
			</div>
		</Card>
	);
}
