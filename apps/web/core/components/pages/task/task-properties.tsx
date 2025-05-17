import { ITeamTask } from '@/core/types/interfaces';
import moment from 'moment';
import { useTranslations } from 'next-intl';

const TaskProperties = ({ task }: { task: ITeamTask | null }) => {
	const t = useTranslations();

	return (
		<div className="flex flex-col gap-2 text-[0.625rem] 3xl:text-[0.700rem] text-[#A5A2B2] font-[600]">
			{task?.createdAt && (
				<p>
					{t('pages.taskDetails.CREATED')}
					{moment(task?.createdAt).format(' DD MMMM YYYY, hh:mm A')}
				</p>
			)}
			{task?.updatedAt && (
				<p>
					{t('pages.taskDetails.UPDATED')}
					{moment(task?.updatedAt).format(' DD MMMM YYYY, hh:mm A')}
				</p>
			)}
			{task?.resolvedAt && (
				<p>
					{t('pages.taskDetails.RESOLVED')}

					{moment(task?.resolvedAt).format(' DD MMMM YYYY, hh:mm A')}
				</p>
			)}
		</div>
	);
};

export default TaskProperties;
