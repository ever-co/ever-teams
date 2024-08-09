'use client';

import { useTimeLogs } from '@app/hooks/features/useTimeLogs';
import { useEffect, useState } from 'react';
import { CalendarDatum, ResponsiveCalendar } from '@nivo/calendar';
import Skeleton from 'react-loading-skeleton';
import moment from 'moment';
import Separator from '@components/ui/separator';

export function ActivityCalendar() {
    const { timerLogsDailyReport, timerLogsDailyReportLoading } = useTimeLogs();
    const [calendarData, setCalendarData] = useState<CalendarDatum[]>([]);
    useEffect(() => {
        setCalendarData(
            timerLogsDailyReport.map((el) => ({ value: Number((el.sum / 3600).toPrecision(2)), day: el.date }))
        );
    }, [timerLogsDailyReport]);

    const colorRange = [
        '#9370DB',
        '#6A5ACD',
        '#4169E1',
        '#0000FF',
        '#1E90FF',
        '#87CEEB',
        '#FFA500',
        '#FF8C00',
        '#FF4500',
        '#FF0000'
    ];

    return (
        <div className="h-[650px] w-full flex items-center justify-center overflow-y-hidden overflow-x-auto">
            {timerLogsDailyReportLoading ? (
                <ActivityCalendarSkeleton />
            ) : (
                <div className='flex flex-col w-full h-full'>
                    <ActivityLegend />
                    <div className='h-80 w-full'>
                        <ResponsiveCalendar
                            tooltip={(value) => (
                                <div className="flex items-center mb-2">
                                    <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: value.color }}></span>
                                    <span className={`text-[14px] font-semibold dark:!text-primary-xlight`}>{value.day}</span>
                                </div>
                            )}
                            yearLegend={(value) => value}
                            data={calendarData}
                            from={moment().startOf('year').toDate()}
                            to={moment().startOf('year').toDate()}
                            emptyColor="#ffffff"
                            colors={colorRange}
                            yearSpacing={40}
                            monthBorderWidth={0}
                            dayBorderWidth={0}
                            daySpacing={2}
                            monthLegendPosition="before"
                            margin={{ top: 0, right: 5, bottom: 0, left: 5 }}
                            legends={[
                                {
                                    anchor: 'bottom-right',
                                    direction: 'row',
                                    translateY: 36,
                                    itemCount: 4,
                                    itemWidth: 70,
                                    itemHeight: 20,
                                    itemsSpacing: 14,
                                    itemDirection: 'left-to-right',
                                    symbolSize: 20,
                                    data: [
                                        { color: '#9370DB', label: '0 - 4 Hours', id: 'legend-purple' },
                                        { color: '#0000FF', label: '4 - 10 Hours', id: 'legend-blue' },
                                        { color: '#FFA500', label: '10 - 18 Hours', id: 'legend-orange' },
                                        { color: '#FF0000', label: '18 - 24 Hours', id: 'legend-red' }
                                    ]
                                }
                            ]}
                            monthSpacing={20}
                            monthLegend={(_, __, d) => d.toLocaleString('en-US', { month: 'short' })}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// Skeletons
function ActivityCalendarSkeleton() {
    const { innerWidth: deviceWith } = window;

    const skeletons = Array.from(Array(12));

    return (
        <div className="w-full overflow-hidden flex h-32 items-center justify-around">
            {skeletons.map((_, index) => (
                <Skeleton
                    key={index}
                    width={(deviceWith - (deviceWith * 10) / 100) / 12}
                    className=" dark:bg-transparent h-32"
                />
            ))}
        </div>
    );
}

function ActivityLegend() {
    return (
        <div className="flex w-full items-center justify-start p-1 bg-white dark:bg-dark--theme-light rounded-lg shadow shadow-slate-50 dark:shadow-slate-700 space-x-3 px-3">
            <h3 className="text-lg font-bold mb-2">Legend</h3>
            <Separator />
            <div className="flex items-center" id="legend-purple">
                <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#9370DB' }}></span>
                <span>0 - 4 Hours</span>
            </div>
            <Separator />
            <div className="flex items-center" id="legend-blue">
                <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#0000FF' }}></span>
                <span>4 - 10 Hours</span>
            </div>
            <Separator />
            <div className="flex items-center" id="legend-orange">
                <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#FFA500' }}></span>
                <span>10 - 18 Hours</span>
            </div>
            <Separator />
            <div className="flex items-center" id="legend-red">
                <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#FF0000' }}></span>
                <span>18 - 24 Hours</span>
            </div>
        </div>
    );
}
