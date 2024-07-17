import { dateRangeAllPlanState, dateRangeFuturePlanState, dateRangePastPlanState } from "@app/stores";
import { useRecoilState } from "recoil";

export const useDateRange = (tab: string | any) => {
    const [dateFuture, setDateFuture] = useRecoilState(dateRangeFuturePlanState);
    const [dateAllPlan, setDateAllPlan] = useRecoilState(dateRangeAllPlanState);
    const [datePastPlan, setDatePastPlan] = useRecoilState(dateRangePastPlanState);
    switch (tab) {
        case 'Future Tasks':
            return { date: dateFuture, setDate: setDateFuture };
        case 'Past Tasks':
            return { date: datePastPlan, setDate: setDatePastPlan };
        case 'All Tasks':
        default:
            return { date: dateAllPlan, setDate: setDateAllPlan };
    }
}
