import { GroupedTimesheet } from '@/app/hooks/features/useTimesheet';
import { IUser } from '@/app/interfaces';
import TimesheetSkeleton from '@/core/components/shared/skeleton/TimesheetSkeleton';
import { DataTableTimeSheet } from 'lib/features/integrations/calendar';
import { useTranslations } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/ui/empty-state';

export function TimesheetView({
	data,
	loading,
	user
}: {
	data?: GroupedTimesheet[];
	loading?: boolean;
	user?: IUser | undefined;
}) {
	const t = useTranslations();

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
