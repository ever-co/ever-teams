import { FC } from 'react';
import { CalendarPageSkeleton as CalendarRouteSkeleton } from '@/core/components/pages/calendar/calendar-page-skeleton';

interface CalendarPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
}

/** Kept for existing imports: the calendar page has one skeleton, the one of its own folder. */
export const CalendarPageSkeleton: FC<CalendarPageSkeletonProps> = () => {
	return <CalendarRouteSkeleton />;
};

export default CalendarPageSkeleton;
