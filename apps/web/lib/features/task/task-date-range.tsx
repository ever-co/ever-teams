"use client"
import React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "lib/utils"
import { Button } from "@components/ui/button"
import { Calendar } from "@components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@components/ui/popover"
import { DateRange } from "react-day-picker"
import { SetterOrUpdater } from "recoil"

interface ITaskDatePickerWithRange {
    className?: React.HTMLAttributes<HTMLDivElement>,
    date?: DateRange;
    onSelect?: SetterOrUpdater<DateRange | undefined>;
}
export function TaskDatePickerWithRange({
    className,
    date,
    onSelect,
}: ITaskDatePickerWithRange) {
    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[250px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "dd.MM.yyyy")} -{" "}
                                    {format(date.to, "dd.MM.yyyy")}
                                </>
                            ) : (
                                format(date.from, "dd.MM.yyyy")
                            )
                        ) : (
                            <span>Planned date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                        initialFocus
                        mode={'range'}
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={onSelect}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
