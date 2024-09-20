import {
  dateRangeAllPlanState,
  dateRangeFuturePlanState,
  dateRangePastPlanState,
  getFirstAndLastDateState
} from '@app/stores';
import { useAtom, useAtomValue } from 'jotai';

export const useDateRange = (tab: string | any) => {
  const itemsDate = useAtomValue(getFirstAndLastDateState);
  const [dateFuture, setDateFuture] = useAtom(dateRangeFuturePlanState);
  const [dateAllPlan, setDateAllPlan] = useAtom(dateRangeAllPlanState);
  const [datePastPlan, setDatePastPlan] = useAtom(dateRangePastPlanState);

  switch (tab) {
    case 'Future Tasks':
      return { date: dateFuture, setDate: setDateFuture, data: itemsDate };
    case 'Past Tasks':
      return { date: datePastPlan, setDate: setDatePastPlan, data: itemsDate };
    case 'All Tasks':
    default:
      return { date: dateAllPlan, setDate: setDateAllPlan, data: itemsDate };
  }
};
