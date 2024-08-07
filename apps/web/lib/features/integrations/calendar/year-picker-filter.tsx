"use client"
import * as React from "react"
import { CalendarDaysIcon as CalendarIcon } from "lucide-react"
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";
import FullCalendar from "@fullcalendar/react";
import moment from "moment";
interface IYearDateFilter {
    calendarRef: React.MutableRefObject<FullCalendar | null>
}
export function YearDateFilter({ calendarRef }: IYearDateFilter) {
    const current = calendarRef.current;
    const [currentDate, setCurrentDate] = React.useState(new Date());


    const updateCurrentDate = () => {
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            setCurrentDate(calendarApi.getDate());

        }
    };

    function goNext() {
        if (current) {
            const calendarApi = current.getApi()
            calendarApi.next()
            updateCurrentDate();
        }
    }
    function goPrev() {
        if (current) {
            const calendarApi = current.getApi()
            calendarApi.prev();
            updateCurrentDate();
        }
    }

    React.useEffect(() => {
        updateCurrentDate();
    }, [updateCurrentDate]); // deepscan-disable-line

    return (
        <div className="w-[200px] flex items-center !text-gray-800 dark:!text-slate-200 justify-between text-left font-normal h-10 border border-slate-200 rounded-lg px-2">
            <div className="flex">
                <CalendarIcon className="mr-2 h-5 w-5" />
                <span>{moment(currentDate).format('MMM')}{" "}{currentDate.getFullYear()}</span>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={goPrev}>
                    <MdKeyboardArrowLeft />
                </button>
                <button onClick={goNext}>
                    <MdKeyboardArrowRight />
                </button>
            </div>
        </div>

    )
}
