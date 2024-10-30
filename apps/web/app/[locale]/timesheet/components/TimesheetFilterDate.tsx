import { cn } from "@/lib/utils"
import { DatePicker } from "@components/ui/DatePicker"
import { Button } from "@components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@components/ui/popover"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import React from "react"
import { MdKeyboardArrowRight } from "react-icons/md"
import { PiCalendarDotsThin } from "react-icons/pi"

interface DatePickerInputProps {
    date: Date | null;
    label: string;
}
export function TimesheetFilterDate() {

    const [dateRange, setDateRange] = React.useState<{ from: Date | null; to: Date | null }>({
        from: new Date(),
        to: new Date(),
    });

    const handleFromChange = (fromDate: Date | null) => {
        setDateRange((prev) => ({ ...prev, from: fromDate }));
    };

    const handleToChange = (toDate: Date | null) => {
        if (dateRange.from && toDate && toDate < dateRange.from) {
            return;
        }
        setDateRange((prev) => ({ ...prev, to: toDate }));
    };

    return (<>
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                    )}>
                    <CalendarIcon />
                    {dateRange.from ? format(dateRange.from, "PPP") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 flex">
                <div className="flex flex-col p-2 gap-2">
                    <DynamicDatePicker
                        label="From"
                        date={dateRange.from}
                        setDate={handleFromChange}
                    />
                    <DynamicDatePicker
                        label="To"
                        date={dateRange.to}
                        setDate={handleToChange}
                        minDate={dateRange.from}
                    />
                </div>
                <div className="flex flex-col p-2">
                    {["Today", "Last 7 days", "Last 30 days", "This year (2024)", "Custom Date Range"].map((label, index) => (
                        <Button key={index} variant="outline" className="h-7 flex items-center justify-between border-none text-[12px] text-gray-700">
                            <span> {label}</span>
                            {label === 'Custom Date Range' && <MdKeyboardArrowRight />}
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    </>
    )
}


const DatePickerInput: React.FC<DatePickerInputProps> = ({ date, label }) => (
    <>
        <Button
            variant="outline"
            className={cn(
                "w-[150px] justify-start text-left font-normal bg-transparent hover:bg-transparent text-black h-8 border border-transparent dark:border-transparent",
                !date && "text-muted-foreground"
            )}
        >
            {date ? format(date, "LLL dd, y") : <span>{label}</span>}
        </Button>
        <PiCalendarDotsThin className="h-5 w-5 dark:text-gray-500" />
    </>
);

export function DynamicDatePicker({
    label,
    date,
    setDate,
    minDate
}: {
    label: string;
    date: Date | null;
    setDate: (date: Date | null) => void;
    minDate?: Date | null;

}) {
    return (
        <div>
            <DatePicker
                buttonVariant={'link'}
                className="dark:bg-dark--theme-light rounded-lg bg-white"
                buttonClassName={'decoration-transparent flex items-center w-full bg-white dark:bg-dark--theme-light border-gray-300 justify-start text-left font-normal text-black h-10 border dark:border-slate-600 rounded-md'}
                customInput={<DatePickerInput date={date} label={label} />}
                mode="single"
                numberOfMonths={1}
                initialFocus
                defaultMonth={date ?? new Date()}
                selected={date ?? new Date()}
                onSelect={(selectedDate) => {
                    if (selectedDate && (!minDate || selectedDate >= minDate)) {
                        setDate(selectedDate);
                    }
                }}
                modifiersClassNames={{
                    disabled: 'bg-[#d6d3d1] text-gray-300 cursor-not-allowed',
                }}
                disabled={minDate ? [{ before: minDate }] : []}

            />
        </div>
    );
}
