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
                    <ResponsiveCalendar
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
                        margin={{ top: 10, right: 5, bottom: 10, left: 5 }}
                        legends={[
                            {
                                anchor: 'bottom-right',
                                direction: 'row',
                                translateY: 36,
                                itemCount: 3,
                                itemWidth: 42,
                                itemHeight: 36,
                                itemsSpacing: 14,
                                itemDirection: 'right-to-left',
                                data: [
                                    { color: '#0000FF', label: '8 hours or more', id: 'legend-blue' },
                                    { color: '#6A5ACD', label: '6 hours', id: 'legend-slateblue' },
                                    { color: '#9370DB', label: '4 hours', id: 'legend-purple' },
                                    { color: '#ADD8E6', label: '2 hours', id: 'legend-light-blue' }
                                ]
                            }
                        ]}
                        monthSpacing={20}
                        monthLegend={(year, month) => {
                            return new Date(year, month).toLocaleString('en-US', { month: 'short' });
                        }}
                        theme={{
                            labels: {
                                text: {
                                    fill: '#9ca3af',
                                    fontSize: 16,
                                    font: 'icon',
                                    animation: 'ease',
                                    border: '12',
                                }
                            }
                        }}
                    />


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
