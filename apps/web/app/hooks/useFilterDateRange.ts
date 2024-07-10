import { dateRangeState, filteredDataState, originalDataState } from '@app/stores';
import { useEffect } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil';


export function useFilterDateRange(itemsData: any) {
    const [date] = useRecoilState(dateRangeState);
    const [originalData, setOriginalData] = useRecoilState(originalDataState);
    const filteredData = useRecoilValue(filteredDataState);

    useEffect(() => {
        if (originalData.length) {
            setOriginalData(itemsData);
        }
    }, [originalData, setOriginalData, date]);
    return { originalData, filteredData }
}
