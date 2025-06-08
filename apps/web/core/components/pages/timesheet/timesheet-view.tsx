import { GroupedTimesheet } from '@/core/hooks/activities/use-timesheet';
import { TUser } from '@/core/types/schemas';
import { DataTableTimeSheet } from '@/core/components/integration/calendar';
import { useTranslations } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import TimesheetSkeleton from '../../activities/timesheet-skeleton';
import { toast } from 'sonner';
import { useRef } from 'react';

export function TimesheetView({
	data,
	loading,
	user
}: {
	data?: GroupedTimesheet[];
	loading?: boolean;
	user?: TUser | undefined;
}) {
	const t = useTranslations();
	const isToastShown = useRef(false);

	if (loading || !data) {
		return (
			<div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme">
				{Array.from({ length: 10 }).map((_, index) => (
					<TimesheetSkeleton key={index} />
				))}
			</div>
		);
	}

	if (data.length === 0) {
		if (!isToastShown.current) {
			toast.info('TimesheetView - No data found, showing empty state');
			isToastShown.current = true;
		}
		return (
			<AnimatedEmptyState
				title={t('pages.timesheet.NO_ENTRIES_FOUND')}
				message={t('common.SELECT_DIFFERENT_DATE')}
			/>
		);
	}

	return (
		<div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme">
			<DataTableTimeSheet data={data} user={user} />
		</div>
	);
}
