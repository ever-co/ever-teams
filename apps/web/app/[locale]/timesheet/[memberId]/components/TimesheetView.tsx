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
			<div className="grow w-full bg-white dark:bg-dark--theme rounded-md border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center h-full min-h-[280px] transition-colors duration-150">
				<div className="text-center space-y-3">
					<div className="mx-auto w-16 h-16 rounded-full bg-[#6755c933] dark:bg-light--theme-light flex items-center justify-center">
						<span className="text-2xl text-primary">0</span>
					</div>
					<div className="space-y-2">
						<p className="text-lg font-medium text-gray-900 dark:text-gray-100">
							{t('pages.timesheet.NO_ENTRIES_FOUND')}
						</p>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							{t('common.SELECT_DIFFERENT_DATE')}
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme">
			<DataTableTimeSheet data={data} user={user} />
		</div>
	);
}
