'use client';
import { useState, useRef, JSX } from 'react';
import FullCalendar from '@fullcalendar/react';
import { format } from 'date-fns';
import Image from 'next/image';
import { Button } from '@/core/components';
import { YearDateFilter } from './year-picker-filter';
import CalendarComponent from './calendar-component';
import { formatWithSuffix } from '@/core/lib/helpers';
import { useLocalStorageState } from '@/core/hooks';
import {
	ChevronDown,
	ChevronRight,
	Clock,
	Filter,
	IconsAlarmOutline,
	IconsCalendarMonthOutline,
	Timer
} from '@/core/components/icons';
import { controlGroupRecipe } from '@/core/components/common/input';
import { clsxm } from '@/core/lib/utils';
import { APP_NAME } from '@/core/constants/config/constants';
import { getPlaceholderImageUrl } from '@/core/lib/helpers/placeholder-image';

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
				icon: <Timer size="1em" className="inline-block mr-1 text-[#16a34a]" />
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
					<span className="text-[11px] leading-4 font-semibold">{eventInfo.event.title}</span>
				</div>
				<span className="text-[11px] leading-4 font-semibold tabular-nums">05:30h</span>
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
		<div className="-mx-2 flex flex-col overflow-hidden px-2 py-8">
			<div className="w-full rounded-xl bg-card p-4 hairline-ring ring-border shadow-sm shadow-black/6.5">
				<div className="flex items-center justify-between w-full p-2">
					<div className="flex items-center gap-3">
						<YearDateFilter calendarRef={calendarRef} />
						<TotalHours />
					</div>
					<div>
						<Button variant="outline" size="default">
							<Filter />
							<span>Filter</span>
						</Button>
					</div>
				</div>
				<div className="flex h-full">
					<CalendarComponent
						calendarRef={calendarRef}
						dayCellClassNames={dayCellClassNames}
						events={events}
						handleDateClick={handleDateClick}
						handleEventDrop={handleEventDrop}
						renderEventContent={renderEventContent}
					/>
					{isDialogOpen === 'open' && (
						<div className={`py-10 m-5 w-1/5 h-full`}>
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
		<div className="flex flex-col w-full md:h-[50vh] lg:h-[90vh] xl:h-[95vh] sticky top-0">
			<div className="h-full w-full grow rounded-xl bg-card py-4 hairline-ring ring-border">
				<span className="p-2 text-sm font-semibold text-muted-foreground">
					{formatWithSuffix(new Date(selectedDate))}
				</span>
				<div className="flex flex-col px-2 w-full h-full">
					<CardItemsProjects
						logo={getPlaceholderImageUrl('330x300', '0ecc9D', 'N')}
						title={`${APP_NAME} projects`}
						totalHours="Total hours 52h"
					/>
					<CardItemsMember
						imageUrl={getPlaceholderImageUrl('330x300', '0ecc9D', 'E')}
						name="Ruslan"
						time="04:06h"
					/>
					<CardItemsMember
						imageUrl={getPlaceholderImageUrl('330x300', '0ecc8D', 'R')}
						name="Ruslan"
						time="04:06h"
					/>
					<CardItemsProjects
						logo={getPlaceholderImageUrl('330x300', 'f97316', 'G')}
						title="Ever Gauzy projects"
						totalHours="Total hours 53h"
					/>
					<CardItemsMember
						imageUrl={getPlaceholderImageUrl('330x300', '0ecc9D', 'K')}
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
		<div className="flex items-center w-full">
			<div className="flex items-center p-1 space-x-2 w-full rounded-md cursor-pointer transition-colors hover:bg-foreground/5">
				<Image
					className="flex justify-center items-center p-1 w-8 h-8 text-white rounded-full"
					src={imageUrl ? imageUrl : ''}
					unoptimized
					alt=""
					width={90}
					height={90}
				/>
				<div className="flex items-center space-x-1 w-full">
					<span className="text-sm">{name}</span>
				</div>
				<div className="flex items-center space-x-2">
					<span className="text-sm tabular-nums text-muted-foreground">{time}</span>
					<ChevronRight className="size-4 text-muted-foreground" />
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
		<div className="flex justify-start items-center pb-2 space-x-2 w-full">
			<div className="flex items-center w-full">
				<Image
					src={logo ? logo : ''}
					unoptimized
					alt="logos"
					width={100}
					height={100}
					className="flex justify-center items-center w-8 h-8 bg-cover rounded-lg"
				/>
				<div className="flex flex-col justify-center items-start p-1">
					<span className="overflow-hidden text-sm font-semibold leading-4">{title}</span>
					<span className="text-xs leading-4 text-muted-foreground">{totalHours}</span>
				</div>
			</div>
			<ChevronDown className="size-4 text-muted-foreground" />
		</div>
	);
};

export function TotalHours() {
	return (
		<div className={clsxm(controlGroupRecipe, 'h-9 w-[200px] justify-between px-2.5 text-left')}>
			<div className="flex items-center">
				<Clock className="mr-2 size-4 text-muted-foreground" />
				<span>Total Hours 240</span>
			</div>
		</div>
	);
}
