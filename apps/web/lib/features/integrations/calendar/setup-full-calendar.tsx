"use client"
import React, { useState, useRef } from 'react';
import { LuCalendarPlus } from "react-icons/lu";
import { IoIosArrowDown, IoIosArrowForward } from "react-icons/io";
import { IoTimeSharp } from "react-icons/io5";
import { MdTimer } from "react-icons/md";
import FullCalendar from '@fullcalendar/react';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { startOfYear, endOfYear, format } from 'date-fns';
import Image from 'next/image';
import { Button } from 'lib/components';
import { SettingFilterIcon } from 'assets/svg';
import { YearDateFilter } from './year-picker-filter';
import { cn } from 'lib/utils';
// import { IOrganizationTeamList } from '@app/interfaces';

interface Event {
    id?: string;
    title: string;
    start: string;
    times?: string,
    color: string;
    textColor?: string,
    padding?: number,
    extendedProps?: {
        icon?: JSX.Element;
    },

}

export function SetupFullCalendar() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    // const [newEventTitle, setNewEventTitle] = useState('');
    const calendarRef = useRef<FullCalendar | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [events, setEvents] = useState<Event[]>([
        {
            id: '10',
            title: 'Auto',
            start: '2024-08-01',
            color: '#dcfce7',
            textColor: "#16a34a",
            extendedProps: {
                icon: <MdTimer className="inline-block mr-1 text-[#16a34a]" />,
            },


        },
        {
            id: '13',
            title: 'Manual',
            start: '2024-08-01',
            color: '#ffedd5',
            textColor: "#f97316",
            extendedProps: {
                icon: <LuCalendarPlus className="inline-block mr-1 text-[#f97316]" />,
            },
        },
        {
            id: '12',
            title: 'Auto',
            start: '2024-08-01',
            color: '#dcfce7',
            textColor: "#16a34a",
            extendedProps: {
                icon: <MdTimer className="inline-block mr-1 text-[#16a34a]" />,
            },

        },
        {
            id: '11',
            title: 'Manual',
            start: '2024-08-02',
            color: '#ffedd5',
            textColor: "#f97316",
            extendedProps: {
                icon: <LuCalendarPlus className="inline-block mr-1 text-[#f97316]" />,
            },
        },
    ]);

    const handleDateClick = (info: { dateStr: string }) => {
        setSelectedDate(info?.dateStr);
        setIsDialogOpen((prev) => !prev);
    };

    const renderEventContent = (eventInfo: any) => {
        return (
            <div className='flex justify-between w-full items-center text-ellipsis rounded-md p-[1.5px]'>
                <div className='w-full'>
                    {eventInfo.event.extendedProps.icon}
                    <span className='text-[11px] leading-4 font-bold'>{eventInfo.event.title}</span>
                </div>
                <span className='text-[11px] leading-4 font-bold'>05:30h</span>
            </div>
        );
    };

    const dayCellClassNames = (arg: any) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const dateStr = format(arg.date, 'yyyy-MM-dd');
        if (today === dateStr) {
            return ['today-cell'];
        }
        return ['alldays-cell'];
    };

    const handleEventClick = (info: { event: { id: string; startStr: string } }) => {
        const isDelete = confirm(`Do you want to delete the event: ${info.event?.id}?`);
        if (isDelete) {
            const updatedEvents = events.filter(event =>
                event.id !== info.event.id || event.start !== info.event.startStr
            );
            setEvents(updatedEvents);
        }
    };

    const handleEventDrop = (info: { event: { id: string; startStr: string } }) => {
        const updatedEvents = events.map(event =>
            event.id === info.event.id ? { ...event, start: info.event.startStr } : event
        );
        setEvents(updatedEvents);
    };






    return (
        <div className='flex overflow-hidden'>
            <div className='w-full min-h-[600px] p-[32px] bg-white dark:!bg-dark--theme'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-5'>
                        <YearDateFilter calendarRef={calendarRef} />
                        <TotalHours />
                    </div>
                    <div>
                        <Button
                            className='flex items-center justify-center h-10 rounded-lg'
                            variant='primary'>
                            <SettingFilterIcon className="dark:text-white w-3.5" strokeWidth="1.8" />
                            <span>Filter</span>
                        </Button>
                    </div>
                </div>
                <FullCalendar
                    dayHeaderClassNames={'font-semibold text-[14px] text-gray-400 !bg-light--theme dark:!bg-dark--theme'}
                    viewClassNames={'bg-white text-[18px] font-semibold !bg-light--theme dark:!bg-dark--theme w-full'}
                    ref={calendarRef}
                    stickyHeaderDates
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    headerToolbar={{
                        left: '',
                        center: '',
                        right: '',
                    }}
                    views={{
                        dayGridMonth: { buttonText: 'Month' },
                        dayGridWeek: { buttonText: 'Week' },
                        timeGridDay: { buttonText: 'Day' },
                        listWeek: { buttonText: 'List' },
                        yearView: {
                            type: 'dayGridMonth',
                            buttonText: 'Year',
                            duration: { months: 36 },
                            visibleRange: (currentDate) => {
                                const start = startOfYear(currentDate);
                                const end = endOfYear(currentDate);
                                return { start, end };
                            },
                            titleFormat: { year: 'numeric' },
                            eventClassNames: (info) => info.event.classNames,
                        },
                    }}
                    // weekends={false}
                    dayCellClassNames={dayCellClassNames}
                    initialView="dayGridMonth"
                    events={events}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    eventContent={renderEventContent}
                    editable={true}

                />
                <style jsx global>{`
                .fc .fc-daygrid-day.fc-day-today {
                    background-color: inherit !important;
                }
                .today-cell .fc-daygrid-day-number {
                    background-color: #3826a6;
                    color: white;
                    border-radius: 50%;
                    display: inline-block;
                    width: 1.9em;
                    height: 1.9em;
                    line-height: 1.5em;
                    text-align: center !important;
                    margin: 0.2em;
                }
                .alldays-cell .fc-daygrid-day-number {
                    display: inline-block;
                    width: 1.9em;
                    height: 1.9em;
                    line-height: 1.5em;
                    text-align: center !important;
                    margin: 0.2em;
                }
            `}</style>
            </div>
            {isDialogOpen && (
                <div className={`py-10 w-1/5 m-5`}>
                    <CardItems selectedDate={selectedDate as any} />
                </div>
            )}
        </div>
    )
}



export const CardItems = ({ selectedDate }: { selectedDate: Date }) => {
    return (
        <div className='h-full  w-full  border  border-slate-200 rounded-xl  overflow-scroll py-4'>
            <span className='p-2 text-[16px] font-normal text-gray-400'>
                {format(selectedDate, 'PPP')}
            </span>
            <div className='px-2 w-full h-full'>
                <CardItemsProjects />
                <CardItemsMember imageUrl='' name='' time='' />
                <CardItemsMember imageUrl='' name='' time='' />

                <CardItemsProjects />
                <CardItemsMember imageUrl='' name='' time='' />
                <CardItemsMember imageUrl='' name='' time='' />
            </div>
        </div>
    )
}


export const CardItemsMember = ({ imageUrl, name, time }: { imageUrl?: string, name?: string, time?: string }) => {
    return (
        <div className='w-full  flex items-center'>
            <div className='w-full flex items-center space-x-2 p-2 cursor-pointer hover:bg-slate-100 rounded'>
                <Image className='text-white p-1 rounded-full flex items-center justify-center' src={imageUrl!} alt='' width={90} height={90} />
                <div className='flex items-center space-x-1 w-full'>
                    <span className='text-[14px]'>{name}</span>
                    <span className='text-[14px] text-gray-400'>{time}</span>
                </div>
                <IoIosArrowForward />
            </div>
        </div>
    )
}

export const CardItemsProjects = ({ logo, title, totalHours }: { logo?: string, title?: string, totalHours?: string }) => {
    return (
        <div className='flex items-center justify-start space-x-2 w-full pb-2'>
            <div className='flex items-center w-full'>
                <Image src={logo!} alt='logos' width={100} height={100} className='h-8 w-8 bg-cover rounded-lg flex items-center justify-center' />
                <div className='flex items-start flex-col justify-center p-1'>
                    <span className='font-bold text-[16px] overflow-hidden leading-4'>{title}</span>
                    <span className='text-gray-400 text-[12px] leading-4'>{totalHours}</span>
                </div>
            </div>
            <IoIosArrowDown />
        </div>
    )
}


export function TotalHours() {
    return (
        <div
            className={cn(
                "w-[200px] flex items-center !text-gray-800 dark:!text-slate-200 justify-between text-left font-normal h-10 border border-slate-200 rounded-lg px-2",
            )}
        >
            <div className="flex items-center">
                <IoTimeSharp className="mr-2 h-5 w-5" />
                <span>Total Hours 240</span>
            </div>
        </div>

    )
}
