import moment from 'moment';
import React from 'react';
import { ITeamTask } from '@app/interfaces';
import { useTranslation } from 'lib/i18n';

const TaskProperties = ({ task }: { task: ITeamTask | null }) => {
	const { trans } = useTranslation('taskDetails');

	return (
		<div className="flex flex-col gap-3 text-xs text-[#A5A2B2] pl-4 mt-4 font-[500]">
			{task?.createdAt && (
				<p>
					{trans.CREATED}
					<span className="ml-1">
						{moment(task?.createdAt).format('DD MMMM YYYY, hh:mm A')}
					</span>
				</p>
			)}
			{task?.updatedAt && (
				<p>
					{trans.UPDATED}
					<span className="ml-1">
						{moment(task?.updatedAt).format('DD MMMM YYYY, hh:mm A')}
					</span>
				</p>
			)}
			{task?.resolvedAt && (
				<p>
					{trans.RESOLVED}
					<span className="ml-1">
						{moment(task?.resolvedAt).format('DD MMMM YYYY, hh:mm A')}
					</span>
				</p>
			)}
		</div>
	);
};

export default TaskProperties;
