import { useEffect, useRef } from 'react';
import { useTaskStatistics } from './use-task-statistics';
import { useIntersectionObserver } from '@uidotdev/usehooks';

export function useGetTasksStatsData(employeeId?: string | null, triggerWithIObserver = true) {
	const refMap = useRef(new Map());
	const { getTasksStatsData } = useTaskStatistics();
	const [IObserverRef, entry] = useIntersectionObserver({
		threshold: 0,
		root: null,
		rootMargin: '0px'
	});

	useEffect(() => {
		if (!employeeId) return;

		const map = refMap.current;

		const loadTaskStats = () => {
			if (!map.has(employeeId)) {
				map.set(employeeId, true);
				getTasksStatsData(employeeId);
			}
		};

		const supported = 'IntersectionObserver' in window;

		if (!triggerWithIObserver || !supported) {
			loadTaskStats();
		}

		if (entry?.isIntersecting && supported) {
			loadTaskStats();
		}
	}, [employeeId, triggerWithIObserver, entry, getTasksStatsData]);

	return IObserverRef;
}
