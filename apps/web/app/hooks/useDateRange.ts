import {
  dateRangeAllPlanState,
  dateRangeFuturePlanState,
  dateRangePastPlanState,
  getPlanState
} from '@app/stores';
import { useAtom, useAtomValue } from 'jotai';

export const useDateRange = (tab: string | any) => {
  const itemsPlans = useAtomValue(getPlanState);
  const [dateFuture, setDateFuture] = useAtom(dateRangeFuturePlanState);
  const [dateAllPlan, setDateAllPlan] = useAtom(dateRangeAllPlanState);
  const [datePastPlan, setDatePastPlan] = useAtom(dateRangePastPlanState);

  switch (tab) {
    case 'Future Tasks':
      return { date: dateFuture, setDate: setDateFuture, data: itemsPlans };
    case 'Past Tasks':
      return { date: datePastPlan, setDate: setDatePastPlan, data: itemsPlans };
    case 'All Tasks':
    default:
      return { date: dateAllPlan, setDate: setDateAllPlan, data: itemsPlans };
  }
};
