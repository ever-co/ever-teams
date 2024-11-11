import { GroupedTimesheet } from '@/app/hooks/features/useTimesheet';
import { DataTableTimeSheet } from 'lib/features/integrations/calendar';
import { useTranslations } from 'next-intl';

export function TimesheetView({ data }: { data?: GroupedTimesheet[] }) {
    const t = useTranslations();
    return (
        <div className='grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme'>
            {data ? (
                data.length > 0 ? (
                    <DataTableTimeSheet data={data} />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p>{t('pages.timesheet.NO_ENTRIES_FOUND')}</p>
                    </div>
                )
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p>{t('pages.timesheet.LOADING')}</p>
                </div>
            )}
        </div>
    )
}
