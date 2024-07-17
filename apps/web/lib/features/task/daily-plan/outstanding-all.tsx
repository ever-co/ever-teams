import { EmptyPlans } from 'lib/features/user-profile-plans';
import { TaskCard } from '../task-card';
import { useDailyPlan } from '@app/hooks';
import { TaskEstimatedCount } from '.';
import { useRecoilValue } from 'recoil';
import { dailyPlanViewHeaderTabs } from '@app/stores/header-tabs';
import TaskBlockCard from '../task-block-card';
import { clsxm } from '@app/utils';

interface OutstandingAll {
	profile: any;
}
export function OutstandingAll({ profile }: OutstandingAll) {
	const { outstandingPlans } = useDailyPlan();
	const view = useRecoilValue(dailyPlanViewHeaderTabs);
	const displayedTaskId = new Set();

	const tasks = outstandingPlans.map((plan) => plan.tasks).reduce((red, curr) => red?.concat(curr || []), []);

	return (
		<div className="flex flex-col gap-6">
			<TaskEstimatedCount outstandingPlans={outstandingPlans} />
			{tasks && tasks?.length > 0 ? (
				<>
					{/* <PlanHeader plan={plan} planMode="Outstanding" /> */}
					<ul
						className={clsxm(
							view === 'CARDS' && 'flex-col',
							(view === 'TABLE' || view === 'BLOCKS') && 'flex-wrap',
							'flex gap-2 pb-[1.5rem] overflow-x-scroll'
						)}
					>
						{tasks?.map((task) => {
							//If the task is already displayed, skip it
							if (displayedTaskId.has(task.id)) {
								return null;
							}
							// Add the task to the Set to avoid displaying it again
							displayedTaskId.add(task.id);
							return view === 'CARDS' ? (
								<TaskCard
									key={`${task.id}`}
									isAuthUser={true}
									activeAuthTask={true}
									viewType={'dailyplan'}
									task={task}
									profile={profile}
									type="HORIZONTAL"
									taskBadgeClassName={`rounded-sm`}
									taskTitleClassName="mt-[0.0625rem]"
									planMode="Outstanding"
								/>
							) : (
								<TaskBlockCard key={task.id} task={task} />
							);
						})}
					</ul>
				</>
			) : (
				<EmptyPlans planMode="Outstanding" />
			)}
		</div>
	);
}
