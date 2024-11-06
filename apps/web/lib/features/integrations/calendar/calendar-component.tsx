import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { startOfYear, endOfYear } from 'date-fns';
import {
	ClassNamesGenerator,
	DayCellContentArg,
	EventContentArg,
	EventDropArg,
	EventSourceInput
} from '@fullcalendar/core';
import { ScrollArea } from '@components/ui/scroll-bar';

type CalendarComponentProps = {
	events: EventSourceInput;
	handleDateClick: (arg: DateClickArg) => void;
	handleEventDrop: (arg: EventDropArg) => void;
	renderEventContent: (arg: EventContentArg) => React.ReactNode;
	dayCellClassNames: ClassNamesGenerator<DayCellContentArg> | undefined;
	calendarRef: React.MutableRefObject<FullCalendar | null>;
};

const CalendarComponent: React.FC<CalendarComponentProps> = ({
	events,
	handleDateClick,
	handleEventDrop,
	renderEventContent,
	dayCellClassNames,
	calendarRef
}) => {
	return (
		<ScrollArea className="w-full">
			<FullCalendar
				dayHeaderClassNames="font-semibold text-[14px] text-gray-400  !bg-white dark:!bg-dark--theme"
				viewClassNames="bg-white text-[18px]  font-semibold !bg-white dark:!bg-dark--theme w-full !overflow-auto"
				ref={calendarRef}
				stickyHeaderDates
				plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
				headerToolbar={{
					left: '',
					center: '',
					right: ''
				}}
				views={{
					dayGridMonth: { buttonText: 'Month' },
					dayGridWeek: { buttonText: 'Week' },
					timeGridDay: { buttonText: 'Day' },
					listWeek: { buttonText: 'List' },
					yearView: {
						type: 'dayGridMonth',
						buttonText: 'Year',
						duration: { months: 12 },
						visibleRange: (currentDate) => {
							const start = startOfYear(currentDate);
							const end = endOfYear(currentDate);
							return { start, end };
						},
						titleFormat: { year: 'numeric' },
						eventClassNames: (info) => info.event.classNames
					}
				}}
				dayCellClassNames={dayCellClassNames}
				initialView="dayGridMonth"
				events={events}
				dateClick={handleDateClick}
				eventDrop={handleEventDrop}
				eventContent={renderEventContent}
				editable={true}
				dragScroll={true}
				locale={'pt-br'}
				timeZone={'UTF'}
				allDaySlot={false}
				nowIndicator={true}
				themeSystem="bootstrap"
				contentHeight="auto"
				select={(selected) => {
					console.log(selected.start);
				}}
				eventResize={(resize) => {
					console.log(resize.el.COMMENT_NODE);
				}}

				// dayPopoverFormat={}
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
		</ScrollArea>
	);
};

export default CalendarComponent;
