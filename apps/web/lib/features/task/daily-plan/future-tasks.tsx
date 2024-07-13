import { formatDayPlanDate, tomorrowDate } from '@app/helpers';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { EmptyPlans, PlanHeader } from 'lib/features/user-profile-plans';
import { TaskCard } from '../task-card';
import { Button } from '@components/ui/button';
import { useCanSeeActivityScreen, useDailyPlan } from '@app/hooks';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { AlertPopup } from 'lib/components';

export function FutureTasks({ profile }: { profile: any }) {
	const { deleteDailyPlan, deleteDailyPlanLoading, futurePlans } = useDailyPlan();
	const canSeeActivity = useCanSeeActivityScreen();
	const [popupOpen, setPopupOpen] = useState(false)

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
							className="dark:border-slate-600"
						>
							<AccordionTrigger className="hover:no-underline">
								<div className="text-lg">
									{formatDayPlanDate(plan.date.toString())} ({plan.tasks?.length})
								</div>
							</AccordionTrigger>
							<AccordionContent className="bg-light--theme border-none dark:bg-dark--theme">
								{/* Plan header */}
								<PlanHeader plan={plan} planMode="Outstanding" />

								{/* Plan tasks list */}
								<ul className="flex flex-col gap-2 pb-[1.5rem]">
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

								{/* Delete Plan */}
								{canSeeActivity ? (
									<div className="flex justify-end">
										<AlertPopup
											open={popupOpen}
											buttonOpen={
												//button open popup
												<Button
													onClick={() => setPopupOpen(true)}
													variant="outline"
													className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
												>
													Delete this plan
												</Button>
											}
										>
											{/*button confirm*/}
											<Button
												disabled={deleteDailyPlanLoading}
												onClick={() => deleteDailyPlan(plan.id ?? '')}
												variant="destructive"
												className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-400"
											>
												{deleteDailyPlanLoading && (
													<ReloadIcon className="animate-spin mr-2 h-4 w-4" />
												)}
												Delete
											</Button>
											{/*button cancel*/}
											<Button
												onClick={() => setPopupOpen(false)}
												variant="outline"
												className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
											>
												Cancel
											</Button>
										</AlertPopup>
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
