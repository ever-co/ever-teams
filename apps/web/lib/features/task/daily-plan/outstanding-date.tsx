import { formatDayPlanDate } from '@app/helpers';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { EmptyPlans, PlanHeader } from 'lib/features/user-profile-plans';
import { TaskCard } from '../task-card';
import { useDailyPlan } from '@app/hooks';

interface IOutstandingFilterDate {
	profile: any
}
export function OutstandingFilterDate({ profile }: IOutstandingFilterDate) {
	const { outstandingPlans } = useDailyPlan();
	return (
		<div className="flex flex-col gap-6">
			{outstandingPlans?.length > 0 ? (
				<Accordion
					type="multiple"
					className="text-sm"
					defaultValue={outstandingPlans?.map((plan) => new Date(plan.date).toISOString().split('T')[0])}
				>
					{outstandingPlans?.map((plan) => (
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
											planMode="Outstanding"
										/>
									))}
								</ul>
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			) : (
				<EmptyPlans planMode="Outstanding" />
			)}
		</div>
	);
}
