import { EmptyPlans } from 'lib/features/user-profile-plans';
import { TaskCard } from '../task-card';
import { useDailyPlan } from '@app/hooks';
import { TaskEstimatedcount } from '.';

interface OutstandingAll {
    profile: any,
}
export function OutstandingAll({ profile }: OutstandingAll) {
    const { outstandingPlans } = useDailyPlan();
    const displayedTaskId = new Set();
    return (
        <div className="flex flex-col gap-6">
            <TaskEstimatedcount outstandingPlans={outstandingPlans} />
            {outstandingPlans?.length > 0 ? (
                <>
                    {outstandingPlans?.map((plan) => (
                        <>
                            {/* <PlanHeader plan={plan} planMode="Outstanding" /> */}
                            <ul className="flex flex-col gap-2">
                                {plan?.tasks?.map((task) => {
                                    //If the task is already displayed, skip it
                                    if (displayedTaskId.has(task.id)) { return null; }
                                    // Add the task to the Set to avoid displaying it again
                                    displayedTaskId.add(task.id);
                                    return <TaskCard
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
                                }
                                )}
                            </ul>
                        </>
                    ))}
                </>

            ) : (
                <EmptyPlans planMode="Outstanding" />
            )}
        </div>
    );
}
