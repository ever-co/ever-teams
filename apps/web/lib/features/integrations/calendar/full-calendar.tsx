"use client"
import React, { useState, useRef } from 'react';
import { IoIosArrowForward, IoIosArrowDown } from "react-icons/io";
import FullCalendar from '@fullcalendar/react';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { startOfYear, endOfYear, format } from 'date-fns';
import Image from 'next/image';
import { IOrganizationTeamList } from '@app/interfaces';


const Calendar: React.FC = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    // const [newEventTitle, setNewEventTitle] = useState('');
    const calendarRef = useRef<FullCalendar | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    let current = calendarRef.current;

    const [events, setEvents] = useState<IOrganizationTeamList[]>([]);
    const handleDateClick = (info: { dateStr: string }) => {
        setSelectedDate(info.dateStr);
        setIsDialogOpen((prev) => !prev);
    };

    const renderEventContent = (eventInfo: any) => {
        return (
            <div className='flex items-center text-ellipsis rounded-md p-[1.5px]'>
                {eventInfo.event.extendedProps.icon}
                <span className='text-[12px] leading-4'>{eventInfo.event.title}</span>
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

    const handleEventClick = (info: { event: { title: string; startStr: string } }) => {
        const isDelete = confirm(`Do you want to delete the event: ${info.event.title}?`);
        if (isDelete) {
            const updatedEvents = events.filter(event =>
                event.id !== info.event.title || event.createdAt !== info.event.startStr
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

    function goNext() {
        if (current) {
            const calendarApi = current.getApi()
            calendarApi.nextYear()
        }
    }
    function goPrev() {
        if (current) {
            const calendarApi = current.getApi()
            calendarApi.prevYear();
        }
    }




    return (
        <div className='flex overflow-hidden'>
            <div className='w-full'>
                <button onClick={goNext} aria-label="Go to next date">
                    Go Next
                </button>
                <button onClick={goPrev} aria-label="Go to previous date">
                    Go Prev
                </button>
                <FullCalendar
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
                    dayHeaderClassNames={'font-semibold text-[14px] text-gray-400'}
                    viewClassNames={'bg-white text-[18px] font-semibold'}
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
                    <CardItemsProject selectedDate={selectedDate as any} />
                </div>
            )}
        </div>
    )
}

export default Calendar



export const CardItemsProject = ({ selectedDate }: { selectedDate: Date }) => {
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
