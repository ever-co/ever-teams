import { ActivityCalendarSkeleton } from '../common/skeleton/activity-calendar-skeleton';
import { TaskCardSkeleton } from '../common/skeleton/profile-component-skeletons';
import dynamic from 'next/dynamic';

export const LazyTaskCard = dynamic(
	() => import('@/core/components/tasks/task-card').then((mod) => ({ default: mod.TaskCard })),
	{
		ssr: false,
		loading: () => <TaskCardSkeleton />
	}
);
export const LazyActivityCalendar = dynamic(
	() => import('@/core/components/activities/activity-calendar').then((mod) => ({ default: mod.ActivityCalendar })),
	{
		ssr: false,
		loading: () => <ActivityCalendarSkeleton />
	}
);
