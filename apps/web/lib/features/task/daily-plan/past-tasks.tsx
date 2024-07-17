import { formatDayPlanDate, yesterdayDate } from '@app/helpers';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { EmptyPlans, FilterTabs, PlanHeader } from 'lib/features/user-profile-plans';
import { TaskCard } from '../task-card';
import { useDailyPlan } from '@app/hooks';
import { useRecoilValue } from 'recoil';
import { dailyPlanViewHeaderTabs } from '@app/stores/header-tabs';
import { HorizontalSeparator } from 'lib/components';
import { clsxm } from '@app/utils';
import TaskBlockCard from '../task-block-card';
import { useFilterDateRange } from '@app/hooks/useFilterDateRange';

export function PastTasks({ profile, currentTab = 'Past Tasks' }: { profile: any; currentTab?: FilterTabs }) {
	const { pastPlans } = useDailyPlan();

	const view = useRecoilValue(dailyPlanViewHeaderTabs);
	const { filteredPastPlanData: filteredPastPlanData } = useFilterDateRange(pastPlans, 'past');

	return (
		<div className="flex flex-col gap-6">
			{filteredPastPlanData?.length > 0 ? (
				<Accordion
					type="multiple"
					className="text-sm"
					defaultValue={[yesterdayDate.toISOString().split('T')[0]]}
				>
					{filteredPastPlanData?.map((plan) => (
						<AccordionItem
							value={plan.date.toString().split('T')[0]}
							key={plan.id}
							className="dark:border-slate-600 !border-none"
						>
							<AccordionTrigger className="!min-w-full text-start hover:no-underline">
								<div className="flex items-center justify-between gap-3 w-full">
									<div className="text-lg min-w-max">
										{formatDayPlanDate(plan.date.toString())} ({plan.tasks?.length})
									</div>
									<HorizontalSeparator />
								</div>
							</AccordionTrigger>
							<AccordionContent className="bg-light--theme border-none dark:bg-dark--theme pb-12">
								{/* Plan header */}
								<PlanHeader plan={plan} planMode="Outstanding" />

								{/* Plan tasks list */}
								<ul
									className={clsxm(
										view === 'CARDS' && 'flex-col',
										view === 'TABLE' && 'flex-wrap',
										'flex gap-2 pb-[1.5rem]',
										view === 'BLOCKS' && 'overflow-x-scroll'
									)}
								>
									{plan.tasks?.map((task) =>
										view === 'CARDS' ? (
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
												planMode={currentTab === 'Past Tasks' ? 'Past Tasks' : undefined}
											/>
										) : (
											<TaskBlockCard key={task.id} task={task} />
										)
									)}
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
