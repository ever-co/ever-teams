'use client';

import { useTimeLogs } from '@app/hooks/features/useTimeLogs';
import { useEffect, useState } from 'react';
import { CalendarDatum, ResponsiveCalendar } from '@nivo/calendar';
import Skeleton from 'react-loading-skeleton';
import moment from 'moment';

export function ActivityCalendar() {
    const { timerLogsDailyReport, timerLogsDailyReportLoading } = useTimeLogs();
    const [calendarData, setCalendarData] = useState<CalendarDatum[]>([]);
    useEffect(() => {
        setCalendarData(
            timerLogsDailyReport.map((el) => ({ value: Number((el.sum / 3600).toPrecision(2)), day: el.date }))
        );
    }, [timerLogsDailyReport]);

    return (
        <div className=" h-[650px] w-full flex items-center justify-center overflow-y-hidden overflow-x-auto">
            {timerLogsDailyReportLoading ? (
                <ActivityCalendarSkeleton />
            ) : (
                <div className='flex flex-col w-full h-full relative'>
                    <ActivityLegend />
                    <ResponsiveCalendar
                        data={calendarData}
                        from={moment().startOf('year').toDate()}
                        to={moment().startOf('year').toDate()}
                        emptyColor="#ffffff"
                        colors={['#ADD8E6', '#9370DB', '#6A5ACD', '#0000FF']}
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
                        monthLegend={(_, __, d) => d.toLocaleString('en-US', { month: 'short' })}
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
        <div className="flex flex-col w-full items-start p-4 bg-white dark:bg-dark--theme-light rounded-lg shadow-sm">
            <h3 className="text-lg font-bold mb-2">Legend</h3>
            <div className="flex items-center mb-2" id="legend-blue">
                <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#0000FF' }}></span>
                <span>8 Hours or more</span>
            </div>
            <div className="flex items-center mb-2" id="legend-slateblue">
                <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#6A5ACD' }}></span>
                <span>6 Hours</span>
            </div>
            <div className="flex items-center mb-2" id="legend-purple">
                <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#9370DB' }}></span>
                <span>4 Hours</span>
            </div>
            <div className="flex items-center mb-2" id="legend-light-blue">
                <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#ADD8E6' }}></span>
                <span>2 Hours</span>
            </div>
        </div>
    )
}
