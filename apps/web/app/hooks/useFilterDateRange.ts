import { IDailyPlan } from '@app/interfaces';
import { dateRangeAllState, dateRangePastState, dateRangeState, filteredAllDataState, filteredDataState, filteredPastDataState, originalAllDataState, originalDataState, originalPastTaskDataState } from '@app/stores';
import { useEffect } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil';

export function useFilterDateRange(itemsData: IDailyPlan[], dataType: 'future' | 'past' | 'all') {
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
        if (!itemsData) return;
        if (dataType === 'future') {
            setOriginalFuturePlanData(itemsData);
        }

    }, [dateFuture, dataType, itemsData?.length, setOriginalFuturePlanData]);


    useEffect(() => {
        if (!itemsData) return;
        if (dataType === 'all') {
            setOriginalAllPlanData(itemsData);
        }
    }, [dateAllPlan, dataType, itemsData?.length, setOriginalAllPlanData]);


    useEffect(() => {
        if (!itemsData) return;
        if (dataType === 'past') {
            setOriginalPastPlanData(itemsData);
        }
    }, [datePastPlan, dataType, itemsData?.length, setOriginalPastPlanData]);

    return {
        originalFuturePlanData,
        originalPastPlanData,
        originalAllPlanData,
        filteredFuturePlanData,
        filteredPastPanData,
        filteredAllPlanData, setDateAllPlan, setDateFuture, setDatePastPlan
    };
}
