import { formatDayPlanDate, yesterdayDate } from '@app/helpers';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { EmptyPlans, PlanHeader } from 'lib/features/user-profile-plans';
import { TaskCard } from '../task-card';
import { useDailyPlan } from '@app/hooks';

export function PastTasks({ profile }: { profile: any }) {
	const { pastPlans } = useDailyPlan();
	return (
		<div className="flex flex-col gap-6">
			{pastPlans?.length > 0 ? (
				<Accordion
					type="multiple"
					className="text-sm"
					defaultValue={[yesterdayDate.toISOString().split('T')[0]]}
				>
					{pastPlans?.map((plan) => (
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
							<AccordionContent className="bg-light--theme border-none dark:bg-dark--theme pb-12">
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
