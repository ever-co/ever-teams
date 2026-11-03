'use client';
import * as React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { controlGroupRecipe } from '@/core/components/common/input';
import { clsxm } from '@/core/lib/utils';
import FullCalendar from '@fullcalendar/react';
import moment from 'moment';
interface IYearDateFilter {
	calendarRef: React.MutableRefObject<FullCalendar | null>;
}
export function YearDateFilter({ calendarRef }: IYearDateFilter) {
	const current = calendarRef.current;
	const [currentDate, setCurrentDate] = React.useState(new Date());

	const updateCurrentDate = React.useCallback(
		() => () => {
			if (calendarRef.current) {
				const calendarApi = calendarRef.current.getApi();
				setCurrentDate(calendarApi.getDate());
			}
		},
		[calendarRef, setCurrentDate]
	);

	const goNext = React.useCallback(() => {
		if (current) {
			const calendarApi = current.getApi();
			calendarApi.next();
			updateCurrentDate();
		}
	}, [current, updateCurrentDate]);

	const goPrev = React.useCallback(() => {
		if (current) {
			const calendarApi = current.getApi();
			calendarApi.prev();
			updateCurrentDate();
		}
	}, [current, updateCurrentDate]);

	React.useEffect(() => {
		updateCurrentDate();
	}, [updateCurrentDate]); // deepscan-disable-line

	return (
		<div className={clsxm(controlGroupRecipe, 'h-9 w-[200px] justify-between pl-2.5 pr-1 text-left')}>
			<div className="flex items-center">
				<Calendar className="mr-2 size-4 text-muted-foreground" />
				<span>
					{moment(currentDate).format('MMM')} {currentDate.getFullYear()}
				</span>
			</div>
			<div className="flex items-center">
				<Button variant="ghost" size="icon-sm" onClick={goPrev}>
					<ChevronLeft />
				</Button>
				<Button variant="ghost" size="icon-sm" onClick={goNext}>
					<ChevronRight />
				</Button>
			</div>
		</div>
	);
}
