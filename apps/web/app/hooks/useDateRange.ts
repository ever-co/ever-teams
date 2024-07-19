import { dateRangeAllPlanState, dateRangeFuturePlanState, dateRangePastPlanState, getFirstAndLastDateState } from "@app/stores";
import { useRecoilState, useRecoilValue } from "recoil";

export const useDateRange = (tab: string | any) => {
    const itemsDate = useRecoilValue(getFirstAndLastDateState);
    const [dateFuture, setDateFuture] = useRecoilState(dateRangeFuturePlanState);
    const [dateAllPlan, setDateAllPlan] = useRecoilState(dateRangeAllPlanState);
    const [datePastPlan, setDatePastPlan] = useRecoilState(dateRangePastPlanState);
    switch (tab) {
        case 'Future Tasks':
            return { date: dateFuture, setDate: setDateFuture, data: itemsDate };
        case 'Past Tasks':
            return { date: datePastPlan, setDate: setDatePastPlan, data: itemsDate };
        case 'All Tasks':
        default:
            return { date: dateAllPlan, setDate: setDateAllPlan, data: itemsDate };
    }
}
