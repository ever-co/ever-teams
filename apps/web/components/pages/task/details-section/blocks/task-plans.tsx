import { useEffect } from 'react';
import { useDailyPlan } from '@app/hooks';
import { detailedTaskState } from '@app/stores';
import { useRecoilState } from 'recoil';
import TaskRow from '../components/task-row';
import { formatDayPlanDate } from '@app/helpers';

export function TaskPlans() {
	const [task] = useRecoilState(detailedTaskState);
	const { taskPlanList, getPlansByTask } = useDailyPlan();

	useEffect(() => {
		getPlansByTask(task?.id);
	}, [getPlansByTask, task?.id]);

	return (
		<section className="flex flex-col gap-4 px-[0.9375rem] pb-[0.9375rem]">
			<div className="flex justify-between h-[1.25rem] items-center">
				<div className="not-italic font-medium text-sm leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					Daily Plans
				</div>
			</div>
			<div className="flex flex-col gap-4 pb-[0.9375rem]">
				{taskPlanList.length > 0 ? (
					taskPlanList?.map((plan) => (
						<TaskRow
							key={plan.id}
							labelIconPath="/assets/svg/profile.svg"
							labelTitle={plan.employee?.fullName}
						>
							<span className="text-xs font-semibold">{formatDayPlanDate(plan.date)}</span>
						</TaskRow>
					))
				) : (
					<div className="text-center text-xs font-normal">Task not planned</div>
				)}
			</div>
		</section>
	);
}
