'use client';
import { useState, useRef } from 'react';
import { IoIosArrowDown, IoIosArrowForward } from 'react-icons/io';
import { IoTimeSharp } from 'react-icons/io5';
import FullCalendar from '@fullcalendar/react';
import { format } from 'date-fns';
import Image from 'next/image';
import { Button } from 'lib/components';
import { SettingFilterIcon } from 'assets/svg';
import { YearDateFilter } from './year-picker-filter';
import CalendarComponent from './calendar-component';
import { PiTimerBold } from 'react-icons/pi';
import { formatWithSuffix } from 'lib/utils';
import { useLocalStorageState } from '@app/hooks';
import { IconsAlarmOutline, IconsCalendarMonthOutline } from '@/icons';

// import { IOrganizationTeamList } from '@app/interfaces';

interface Event {
	id?: string;
	title: string;
	start: string;
	times?: string;
	color: string;
	textColor?: string;
	padding?: number;
	extendedProps?: {
		icon?: JSX.Element;
	};
}

type openDetails = 'open' | 'close';

export function SetupFullCalendar() {
	const [isDialogOpen, setIsDialogOpen] = useLocalStorageState<openDetails>('calendar_details_persistance', 'close');
	// const [newEventTitle, setNewEventTitle] = useState('');
	const calendarRef = useRef<FullCalendar | null>(null);
	const [selectedDate, setSelectedDate] = useState('');
	const [events, setEvents] = useState<Event[]>([
		{
			id: '10',
			title: 'Auto',
			start: '2024-08-01',
			color: '#dcfce7',
			textColor: '#16a34a',
			extendedProps: {
				// @ts-ignore
				icon: <PiTimerBold className="inline-block mr-1 text-[#16a34a]" />
			}
		},
		{
			id: '13',
			title: 'Manual',
			start: '2024-08-01',
			color: '#ffedd5',
			textColor: '#f97316',
			extendedProps: {
				icon: <IconsCalendarMonthOutline className="inline-block mr-1 text-[#f97316]" />
			}
		},
		{
			id: '12',
			title: 'Auto',
			start: '2024-08-01',
			color: '#dcfce7',
			textColor: '#16a34a',
			extendedProps: {
				icon: <IconsAlarmOutline className="inline-block mr-1 text-[#16a34a]" />
			}
		},
		{
			id: '11',
			title: 'Manual',
			start: '2024-08-02',
			color: '#ffedd5',
			textColor: '#f97316',
			extendedProps: {
				icon: <IconsCalendarMonthOutline className="inline-block mr-1 text-[#f97316]" />
			}
		}
	]);

	const handleDateClick = (info: { dateStr: string }) => {
		setSelectedDate(info?.dateStr);
		setIsDialogOpen('open');
	};

	const renderEventContent = (eventInfo: any) => {
		return (
			<div className="flex justify-between w-full items-center text-ellipsis rounded-lg p-[1.2px]">
				<div className="w-full">
					{eventInfo.event.extendedProps.icon}
					<span className="text-[11px] leading-4 font-bold">{eventInfo.event.title}</span>
				</div>
				<span className="text-[11px] leading-4 font-bold">05:30h</span>
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

	// const handleEventClick = (info: { event: { id: string; startStr: string } }) => {
	//     const isDelete = confirm(`Do you want to delete the event: ${info.event?.id}?`);
	//     if (isDelete) {
	//         const updatedEvents = events.filter(event =>
	//             event.id !== info.event.id || event.start !== info.event.startStr
	//         );
	//         setEvents(updatedEvents);
	//     }
	// };

	const handleEventDrop = (info: { event: { id: string; startStr: string } }) => {
		const updatedEvents = events.map((event) =>
			event.id === info.event.id ? { ...event, start: info.event.startStr } : event
		);
		setEvents(updatedEvents);
	};

	return (
		<div className="flex flex-col  overflow-hidden py-[32px] shadow-lg shadow-gray-100 dark:shadow-gray-700 ">
			<div className="w-full bg-white dark:!bg-dark--theme  rounded-xl border border-slate-200  dark:border-slate-700 p-4">
				<div className="flex items-center justify-between w-full  dark:!bg-dark--theme p-2  ">
					<div className="flex items-center space-x-5 dark:!bg-dark--theme ">
						<YearDateFilter calendarRef={calendarRef} />
						<TotalHours />
					</div>
					<div>
						<Button
							className="flex items-center justify-center h-10 rounded-lg dark:bg-primary-light"
							variant="primary"
						>
							<SettingFilterIcon className="dark:text-white w-3.5" strokeWidth="1.8" />
							<span>Filter</span>
						</Button>
					</div>
				</div>
				<div className="flex h-full border border-gray-200 dark:border-gray-700 rounded-lg">
					<CalendarComponent
						calendarRef={calendarRef}
						dayCellClassNames={dayCellClassNames}
						events={events}
						handleDateClick={handleDateClick}
						handleEventDrop={handleEventDrop}
						renderEventContent={renderEventContent}
					/>
					{isDialogOpen === 'open' && (
						<div className={`py-10 w-1/5 m-5 h-full`}>
							<CardItems selectedDate={selectedDate as any} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export const CardItems = ({ selectedDate }: { selectedDate: Date }) => {
	return (
		<div className="flex flex-col w-full bg-red-400 md:h-[50vh] lg:h-[90vh] xl:h-[95vh] sticky top-0">
			<div className="h-full  w-full  border  border-gray-200 dark:border-gray-700 rounded-xl py-4 bg-white dark:!bg-dark--theme-light flex-grow">
				<span className="p-2 text-[16px] text-gray-500 font-bold">
					{formatWithSuffix(new Date(selectedDate))}
				</span>
				<div className="px-2 w-full h-full flex flex-col">
					<CardItemsProjects
						logo="https://dummyimage.com/330x300/0ecc9D/ffffff.jpg&text=N"
						title="Ever teams projects"
						totalHours="Total hours 52h"
					/>
					<CardItemsMember
						imageUrl="https://dummyimage.com/330x300/0ecs9D/ffffff.jpg&text=E"
						name="Ruslan"
						time="04:06h"
					/>
					<CardItemsMember
						imageUrl="https://dummyimage.com/330x300/0ecc8D/ffffff.jpg&text=R"
						name="Ruslan"
						time="04:06h"
					/>
					<CardItemsProjects
						logo="https://dummyimage.com/330x300/f97316/ffffff.jpg&text=G"
						title="Ever Gauzy projects"
						totalHours="Total hours 53h"
					/>
					<CardItemsMember
						imageUrl="https://dummyimage.com/330x300/0ecs9D/ffffff.jpg&text=K"
						name="Ruslan"
						time="04:06h"
					/>
				</div>
			</div>
		</div>
	);
};

export const CardItemsMember = ({ imageUrl, name, time }: { imageUrl?: string; name?: string; time?: string }) => {
	return (
		<div className="w-full flex items-center">
			<div className="w-full flex items-center space-x-2 p-1 cursor-pointer hover:bg-gray-100 rounded dark:hover:bg-gray-700">
				<Image
					className="text-white p-1 rounded-full flex items-center justify-center h-8 w-8"
					src={imageUrl ? imageUrl : ''}
					alt=""
					width={90}
					height={90}
				/>
				<div className="flex items-center space-x-1 w-full">
					<span className="text-[14px] font-normal">{name}</span>
				</div>
				<div className="flex items-center space-x-2">
					<span className="text-[14px] text-gray-400">{time}</span>
					{/* @ts-ignore */}
					<IoIosArrowForward />
				</div>
			</div>
		</div>
	);
};

export const CardItemsProjects = ({
	logo,
	title,
	totalHours
}: {
	logo?: string;
	title?: string;
	totalHours?: string;
}) => {
	return (
		<div className="flex items-center justify-start space-x-2 w-full pb-2">
			<div className="flex items-center w-full">
				<Image
					src={logo ? logo : ''}
					alt="logos"
					width={100}
					height={100}
					className="h-8 w-8 bg-cover rounded-lg flex items-center justify-center"
				/>
				<div className="flex items-start flex-col justify-center p-1">
					<span className="font-bold text-[14px] sm:text-[16px] overflow-hidden leading-4">{title}</span>
					<span className="text-gray-400 text-[12px] leading-4">{totalHours}</span>
				</div>
			</div>
			{/* @ts-ignore */}
			<IoIosArrowDown />
		</div>
	);
};

export function TotalHours() {
	return (
		<div className="w-[200px] flex items-center !text-gray-800 dark:!text-slate-200 justify-between text-left font-normal h-10 border border-slate-200 rounded-lg px-2">
			<div className="flex items-center">
				{/* @ts-ignore */}
				<IoTimeSharp className="mr-2 h-5 w-5" />
				<span>Total Hours 240</span>
			</div>
		</div>
	);
}
