'use client';

import { isTestDateRange } from '@/core/lib/helpers/index';
import { IDailyPlan } from '@/core/types/interfaces/to-review';
import {
	dateRangeAllPlanState,
	dateRangeFuturePlanState,
	dateRangePastPlanState,
	filteredAllPlanDataState,
	filteredFuturePlanDataState,
	filteredPastPlanDataState,
	originalAllPlanState,
	originalFuturePlanState,
	originalPastPlanDataState
} from '@/core/stores';
import { useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { useAtom, useAtomValue } from 'jotai';
/**
 *custom filter the data with date range
 *
 * @export
 * @param {IDailyPlan[]} itemsDailyPlan
 * @param {('future' | 'past' | 'all')} [typeItems]
 * @return {*}
 */
export function useFilterDateRange(itemsDailyPlan: IDailyPlan[], typeItems?: 'future' | 'past' | 'all') {
	const [dateAllPlan, setDateAllPlan] = useAtom(dateRangeAllPlanState);
	const [datePastPlan, setDatePastPlan] = useAtom(dateRangePastPlanState);
	const [dateFuture, setDateFuture] = useAtom(dateRangeFuturePlanState);

	const [originalAllPlanData, setOriginalAllPlanState] = useAtom(originalAllPlanState);
	const [originalPastPlanData, setOriginalPastPlanData] = useAtom(originalPastPlanDataState);
	const [originalFuturePlanData, setOriginalFuturePlanData] = useAtom(originalFuturePlanState);

	const filteredAllPlanData = useAtomValue(filteredAllPlanDataState);
	const filteredPastPlanData = useAtomValue(filteredPastPlanDataState);
	const filteredFuturePlanData = useAtomValue(filteredFuturePlanDataState);

	// useEffect(() => {
	//     if (!itemsDailyPlan) return;

	//     if (typeItems === 'future') {
	//         setOriginalFuturePlanData(itemsDailyPlan);
	//     } else if (typeItems === 'past') {
	//         setOriginalPastPlanData(itemsDailyPlan);
	//     } else if (typeItems === 'all') {
	//         setOriginalAllPlanState(itemsDailyPlan);
	//     }
	// }, [itemsDailyPlan, dateFuture, datePastPlan, dateAllPlan, typeItems, setOriginalAllPlanState, setOriginalFuturePlanData, setOriginalAllPlanState]);
	const updateOriginalPlanData = useMemo(
		() => (data: IDailyPlan[]) => {
			switch (typeItems) {
				case 'future':
					setOriginalFuturePlanData(data);
					break;
				case 'past':
					setOriginalPastPlanData(data);
					break;
				case 'all':
					setOriginalAllPlanState(data);
					break;
				default:
					break;
			}
		},
		[typeItems, setOriginalAllPlanState, setOriginalFuturePlanData, setOriginalPastPlanData]
	);

	useEffect(() => {
		if (!itemsDailyPlan) return;
		updateOriginalPlanData(itemsDailyPlan);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [updateOriginalPlanData, dateAllPlan, datePastPlan, dateFuture, setDateAllPlan, setDatePastPlan, setDateFuture]);

	return {
		filteredAllPlanData,
		filteredPastPlanData,
		filteredFuturePlanData,
		originalAllPlanData,
		originalFuturePlanData,
		originalPastPlanData,
		setDateAllPlan,
		setDateFuture,
		setDatePastPlan
	};
}

export const filterDailyPlan = (date: DateRange, data: IDailyPlan[]) => {
	if (!date || !data.length) return data;
	const { from, to } = date;
	if (!from && !to) {
		return data;
	}
	return data.filter((plan) => {
		const itemDate = new Date(plan.date);
		return isTestDateRange(itemDate, from, to);
	});
};
