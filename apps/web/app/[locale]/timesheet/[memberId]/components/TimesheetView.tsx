import { GroupedTimesheet } from '@/app/hooks/features/useTimesheet';
import { IUser } from '@/app/interfaces';
import TimesheetSkeleton from '@components/shared/skeleton/TimesheetSkeleton';
import { DataTableTimeSheet } from 'lib/features/integrations/calendar';
import { useTranslations } from 'next-intl';

export function TimesheetView({ data, loading, user }: { data?: GroupedTimesheet[]; loading?: boolean, user?: IUser | undefined }) {
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
			<div className="grow w-full bg-[#FFFFFF] dark:bg-dark--theme flex flex-col items-center justify-center h-full min-h-[280px]">
				<p>{t('pages.timesheet.NO_ENTRIES_FOUND')}</p>
			</div>
		);
	}

	return (
		<div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme">
			<DataTableTimeSheet data={data} user={user} />
		</div>
	);
}
