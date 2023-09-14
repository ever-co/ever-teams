import moment from 'moment';
import React from 'react';
import { ITeamTask } from '@app/interfaces';
import { useTranslation } from 'lib/i18n';

const TaskProperties = ({ task }: { task: ITeamTask | null }) => {
	const { trans } = useTranslation('taskDetails');

	return (
		<div className="flex flex-col gap-2 text-[0.625rem] 3xl:text-[0.700rem] text-[#A5A2B2] pl-4 mt-4 font-[600]">
			{task?.createdAt && (
				<p>
					{trans.CREATED}
					{moment(task?.createdAt).format(' DD MMMM YYYY, hh:mm A')}
				</p>
			)}
			{task?.updatedAt && (
				<p>
					{trans.UPDATED}
					{moment(task?.updatedAt).format(' DD MMMM YYYY, hh:mm A')}
				</p>
			)}
			{task?.resolvedAt && (
				<p>
					{trans.RESOLVED}

					{moment(task?.resolvedAt).format(' DD MMMM YYYY, hh:mm A')}
				</p>
			)}
		</div>
	);
};

export default TaskProperties;
