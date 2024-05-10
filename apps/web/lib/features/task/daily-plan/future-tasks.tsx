import { formatDayPlanDate, tomorrowDate } from '@app/helpers';
import { IDailyPlan } from '@app/interfaces';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { EmptyPlans, PlanHeader } from 'lib/features/user-profile-plans';
import { TaskCard } from '../task-card';

export function FutureTasks({ dayPlans, profile }: { dayPlans: IDailyPlan[]; profile: any }) {
	const ascSortedPlans = [...dayPlans].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	const filteredPlans = ascSortedPlans.filter((plan) => {
		const planDate = new Date(plan.date);
		const today = new Date();
		today.setHours(23, 59, 59, 0); // Set today time to exclude timestamps in comparization
		return planDate.getTime() >= today.getTime();
	});
	return (
		<div className="flex flex-col gap-6">
			{filteredPlans.length > 0 ? (
				<Accordion
					type="multiple"
					className="text-sm"
					defaultValue={[tomorrowDate.toISOString().split('T')[0]]}
				>
					{filteredPlans.map((plan) => (
						<AccordionItem
							value={plan.date.toString().split('T')[0]}
							key={plan.id}
							className="dark:border-slate-600"
						>
							<AccordionTrigger className="hover:no-underline">
								<div className="text-lg">
									{formatDayPlanDate(plan.date.toString())} ({plan.tasks?.length})
								</div>
							</AccordionTrigger>
							<AccordionContent className="bg-light--theme border-none dark:bg-dark--theme pb-[5rem]">
								{/* Plan header */}
								<PlanHeader plan={plan} planMode="Outstanding" />

								{/* Plan tasks list */}
								<ul className="flex flex-col gap-2">
									{plan.tasks?.map((task) => (
										<TaskCard
											key={`${task.id}${plan.id}`}
											isAuthUser={true}
											activeAuthTask={true}
											viewType={'dailyplan'}
											task={task}
											profile={profile}
											type="HORIZONTAL"
											taskBadgeClassName={`rounded-sm`}
											taskTitleClassName="mt-[0.0625rem]"
											plan={plan}
											planMode="Future Tasks"
										/>
									))}
								</ul>
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			) : (
				<EmptyPlans planMode="Past Tasks" />
			)}
		</div>
	);
}
