import { dateRangeAllState, dateRangePaskState, dateRangeState, filteredAllDataState, filteredDataState, filteredPastDataState, originalAllDataState, originalDataState, originalPastTaskDataState } from '@app/stores';
import { useEffect } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil';

export function useFilterDateRange(itemsData: any, dataType: 'future' | 'past' | 'all') {
    const [dateAllPlan, setDateAllPlan] = useRecoilState(dateRangeAllState);
    const [datePaskPlan, setDatePaskPlan] = useRecoilState(dateRangePaskState);
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
    }, [dateFuture]);


    useEffect(() => {
        if (dataType === 'all') {
            setOriginalAllPlanData(itemsData);
        }
    }, [dateAllPlan]);


    useEffect(() => {
        if (dataType === 'past') {
            setOriginalPastPlanData(itemsData);
        }
    }, [datePaskPlan]);

    return {
        originalFuturePlanData,
        originalPastPlanData,
        originalAllPlanData,
        filteredFuturePlanData,
        filteredPastPanData,
        filteredAllPlanData, setDateAllPlan, setDateFuture, setDatePaskPlan
    };
}
