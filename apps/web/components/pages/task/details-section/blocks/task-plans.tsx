import { useEffect } from 'react';
import { useDailyPlan } from '@app/hooks';
import { detailedTaskState } from '@app/stores';
import { useAtom } from 'jotai';
import TaskRow from '../components/task-row';
import { formatDayPlanDate } from '@app/helpers';

export function TaskPlans() {
  const [task] = useAtom(detailedTaskState);
  const { taskPlanList, getPlansByTask } = useDailyPlan();

  useEffect(() => {
    if (task?.id) {
      getPlansByTask(task?.id);
    }
  }, [getPlansByTask, task?.id]);

  const groupedByEmployee: { [key: string]: any[] } = {};

  if (taskPlanList?.length > 0)
    for (const currentItem of taskPlanList) {
      const employeeName = currentItem?.employee?.fullName;

      if (typeof employeeName === 'string') {
        if (!groupedByEmployee[employeeName]) {
          groupedByEmployee[employeeName] = [];
        }
        groupedByEmployee[employeeName].push(currentItem);
      }
    }

  return (
    <section className="flex flex-col gap-4 px-[0.9375rem] pb-[0.9375rem]">
      <div className="flex justify-between h-[1.25rem] items-center">
        <div className="not-italic font-medium text-sm leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
          Daily Plans
        </div>
      </div>

      <div className="flex flex-col gap-4 pb-[0.9375rem]">
        {taskPlanList?.length > 0 ? (
          Object.entries(groupedByEmployee).map(
            ([employeeName, employeePlans]) => (
              <div key={employeeName}>
                <TaskRow
                  wrapperClassName="items-start"
                  labelIconPath="/assets/svg/profile.svg"
                  labelTitle={employeeName}
                >
                  <div className="flex flex-col gap-3 pb-[0.9375rem]">
                    {employeePlans?.map((plan) => (
                      <span
                        key={plan.id}
                        className="text-xs font-semibold text-slate-600"
                      >
                        {formatDayPlanDate(plan.date)}
                      </span>
                    ))}
                  </div>
                </TaskRow>
              </div>
            )
          )
        ) : (
          <div className="text-center text-xs font-normal">
            Task not planned
          </div>
        )}
      </div>
    </section>
  );
}
