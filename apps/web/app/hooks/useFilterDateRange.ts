import { dateRangeState, filteredAllDataState, filteredDataState, filteredPastDataState, originalDataState } from '@app/stores';
import { useEffect } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil';


export function useFilterFutureDateRange(itemsData: any) {
    const [date, setDate] = useRecoilState(dateRangeState);
    const [originalData, setOriginalData] = useRecoilState(originalDataState);
    const filteredData = useRecoilValue(filteredDataState);
    useEffect(() => {
        setOriginalData(itemsData)
    }, [date]);

    return { originalData, filteredData, setDate, date }
}

export function useFilterPastTasksDateRange(itemsData: any) {
    const [date, setDate] = useRecoilState(dateRangeState);
    const [originalData, setOriginalData] = useRecoilState(originalDataState);
    const filteredData = useRecoilValue(filteredPastDataState);
    useEffect(() => {
        setOriginalData(itemsData)
    }, [date]);

    return { originalData, filteredData, setDate, date }
}

export function useFilterAllTasksDateRange(itemsData: any) {
    const [date, setDate] = useRecoilState(dateRangeState);
    const [originalData, setOriginalData] = useRecoilState(originalDataState);
    const filteredData = useRecoilValue(filteredAllDataState);
    useEffect(() => {
        setOriginalData(itemsData)
    }, [date]);

    return { originalData, filteredData, setDate, date }
}
