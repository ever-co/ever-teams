import { GroupedTimesheet } from '@/app/hooks/features/useTimesheet';
import { DataTableTimeSheet } from 'lib/features/integrations/calendar';
import { useTranslations } from 'next-intl';

export function TimesheetView({ data, loading }: { data?: GroupedTimesheet[]; loading?: boolean }) {
	const t = useTranslations();

	if (!data) {
		return (
			<div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme flex items-center justify-center">
				<p>{t('pages.timesheet.LOADING')}</p>
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme flex flex-col items-center justify-center h-full min-h-[280px]">
				<p>{t('pages.timesheet.NO_ENTRIES_FOUND')}</p>
			</div>
		);
	}

	return (
		<div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme">
			<DataTableTimeSheet data={data} />
		</div>
	);
}
