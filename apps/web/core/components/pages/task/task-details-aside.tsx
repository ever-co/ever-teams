import { clsxm } from '@/core/lib/utils';
import TaskEstimationsInfo from './details-section/blocks/task-estimations-info';
import TaskMainInfo from './details-section/blocks/task-main-info';
import TaskProgress from './details-section/blocks/task-progress';
import TaskPublicity from './details-section/blocks/task-publicity';
import TaskSecondaryInfo from './details-section/blocks/task-secondary-info';
import { useTranslations } from 'next-intl';
import { TaskPlans } from './details-section/blocks/task-plans';

const TaskDetailsAside = () => {
	const t = useTranslations();
	return (
		<section
			className={clsxm(
				'border border-solid border-[#00000014] dark:border-[#26272C] dark:bg-dark--theme rounded-xl',
				'flex flex-col'
			)}
		>
			<div className="flex justify-between h-[3.25rem] px-[0.9375rem] items-center">
				<div className="not-italic font-semibold text-base leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{t('common.DETAILS')}
				</div>
			</div>
			<TaskPublicity />

			<div className="flex flex-col gap-4">
				<TaskMainInfo />

				{/* Divider */}
				<div className="h-[0.0625rem] bg-[#F2F2F2] dark:bg-[#26272C] w-[95%] mx-auto"></div>

				<TaskPlans />

				{/* Divider */}
				<div className="h-[0.0625rem] bg-[#F2F2F2] dark:bg-[#26272C] w-[95%] mx-auto"></div>

				<TaskSecondaryInfo />

				{/* Divider */}
				<div className="h-[0.0625rem] bg-[#F2F2F2] dark:bg-[#26272C] w-[95%] mx-auto"></div>

				<TaskEstimationsInfo />

				{/* Divider */}
				<div className="h-[0.0625rem] bg-[#F2F2F2] dark:bg-[#26272C] w-[95%] mx-auto"></div>

				<TaskProgress />
			</div>
		</section>
	);
};

export default TaskDetailsAside;
