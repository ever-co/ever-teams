import { dateRangeAllState, dateRangePastState, dateRangeState, filteredAllDataState, filteredDataState, filteredPastDataState, originalAllDataState, originalDataState, originalPastTaskDataState } from '@app/stores';
import { useEffect } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil';

export function useFilterDateRange(itemsData: any, dataType: 'future' | 'past' | 'all') {
    const [dateAllPlan, setDateAllPlan] = useRecoilState(dateRangeAllState);
    const [datePastPlan, setDatePastPlan] = useRecoilState(dateRangePastState);
    const [dateFuture, setDateFuture] = useRecoilState(dateRangeState);


    const [originalAllPlanData, setOriginalAllPlanData] = useRecoilState(originalAllDataState);
    const [originalPastPlanData, setOriginalPastPlanData] = useRecoilState(originalPastTaskDataState);
    const [originalFuturePlanData, setOriginalFuturePlanData] = useRecoilState(originalDataState);

    const filteredAllPlanData = useRecoilValue(
        filteredAllDataState
    );
    const filteredPastPanData = useRecoilValue(
        filteredPastDataState

    );
    const filteredFuturePlanData = useRecoilValue(
        filteredDataState

    );

    useEffect(() => {
        if (dataType === 'future') {
            setOriginalFuturePlanData(itemsData);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFuture]);

    useEffect(() => {
        if (dataType === 'all') {
            setOriginalAllPlanData(itemsData);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateAllPlan]);

    useEffect(() => {
        if (dataType === 'past') {
            setOriginalPastPlanData(itemsData);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datePastPlan]);

    return {
        originalFuturePlanData,
        originalPastPlanData,
        originalAllPlanData,
        filteredFuturePlanData,
        filteredPastPanData,
        filteredAllPlanData, setDateAllPlan, setDateFuture, setDatePastPlan
    };
}
