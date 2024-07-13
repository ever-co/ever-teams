import { formatDayPlanDate, tomorrowDate } from '@app/helpers';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { EmptyPlans, PlanHeader } from 'lib/features/user-profile-plans';
import { TaskCard } from '../task-card';
import { Button } from '@components/ui/button';
import { useCanSeeActivityScreen, useDailyPlan } from '@app/hooks';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useRecoilValue } from 'recoil';
import { dailyPlanViewaHeaderTabs } from '@app/stores/header-tabs';
import TaskBlockCard from '../task-block-card';
import { clsxm } from '@app/utils';
import { HorizontalSeparator } from 'lib/components';

export function FutureTasks({ profile }: { profile: any }) {
	const { deleteDailyPlan, deleteDailyPlanLoading, futurePlans } = useDailyPlan();
	const canSeeActivity = useCanSeeActivityScreen();

	const view = useRecoilValue(dailyPlanViewaHeaderTabs);

	return (
		<div className="flex flex-col gap-6">
			{futurePlans.length > 0 ? (
				<Accordion
					type="multiple"
					className="text-sm"
					defaultValue={[tomorrowDate.toISOString().split('T')[0]]}
				>
					{futurePlans.map((plan) => (
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
							<AccordionContent className="bg-light--theme border-none dark:bg-dark--theme">
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
												plan={plan}
												planMode="Future Tasks"
											/>
										) : (
											<TaskBlockCard key={task.id} task={task} />
										)
									)}
								</ul>

								{/* Delete Plan */}
								{canSeeActivity ? (
									<div className="flex justify-end">
										<Button
											disabled={deleteDailyPlanLoading}
											onClick={() => deleteDailyPlan(plan.id ?? '')}
											variant="destructive"
											className="p-7 py-6 font-normal rounded-xl text-md"
										>
											{deleteDailyPlanLoading && (
												<ReloadIcon className="animate-spin mr-2 h-4 w-4" />
											)}
											Delete this plan
										</Button>
									</div>
								) : (
									<></>
								)}
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
