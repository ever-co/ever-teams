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
import React, { useState } from "react"
import { MdKeyboardArrowRight } from "react-icons/md"
import { PiCalendarDotsThin } from "react-icons/pi"

interface DatePickerInputProps {
    date: Date | null;
    label: string;
}
interface TimesheetFilterDateProps {
    onChange?: (range: { from: Date | null; to: Date | null }) => void;
    initialRange?: { from: Date | null; to: Date | null };
    minDate?: Date;
    maxDate?: Date;
}

export function TimesheetFilterDate({
    onChange,
    initialRange,
    minDate,
    maxDate
}: TimesheetFilterDateProps) {

    const [dateRange, setDateRange] = React.useState<{ from: Date | null; to: Date | null }>({
        from: initialRange?.from ?? new Date(),
        to: initialRange?.to ?? new Date(),
    });
    const [isVisible, setIsVisible] = useState(false)
    const handleFromChange = (fromDate: Date | null) => {
        if (maxDate && fromDate && fromDate > maxDate) {
            return;
        }
        setDateRange((prev) => ({ ...prev, from: fromDate }));
        onChange?.({ ...dateRange, from: fromDate });
    };

    const handleToChange = (toDate: Date | null) => {
        if (dateRange.from && toDate && toDate < dateRange.from) {
            return;
        }
        setDateRange((prev) => ({ ...prev, to: toDate }));
    };

    const handlePresetClick = (preset: string) => {
        const today = new Date();
        switch (preset) {
            case 'Today':
                setDateRange({ from: today, to: today });
                break;
            case 'Last 7 days':
                setDateRange({
                    from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7),
                    to: today
                });
                break;
            case 'Last 30 days':
                setDateRange({
                    from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
                    to: today
                });
                break;
            case `This year (${today.getFullYear()})`:
                setDateRange({
                    from: new Date(today.getFullYear(), 0, 1),
                    to: today
                });
                break;
            case 'Custom Date Range':
                setDateRange({ from: null, to: null });
                break;
            default:
                break;
        }
    };

    const actionButtonClass = "h-4 border-none dark:bg-dark-theme-light text-primary hover:bg-transparent hover:underline"

    return (<>
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    role="combobox"
                    aria-label="Select date range"
                    aria-expanded="false"
                    className={cn(
                        "w-44 justify-start dark:bg-dark-theme h-[2.2rem] items-center gap-x-2 text-left font-normal overflow-hidden text-clip dark:bg-dark-theme-light",
                        !dateRange.from && "text-muted-foreground"
                    )}>
                    <CalendarIcon />
                    {dateRange.from ? (
                        dateRange.to ? (
                            <>
                                {format(dateRange.from, "LLL d")}-{format(dateRange.to, "d, yyyy")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL d, yyyy")
                        )
                    ) : (
                        <span>Pick a date</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 flex dark:bg-dark-theme-light">
                {isVisible && (
                    <div className="flex flex-col p-2 gap-2 translate-x-0 justify-between">
                        <div className="flex flex-col gap-2">
                            <DatePickerFilter
                                label="From"
                                date={dateRange.from}
                                setDate={handleFromChange}
                            />
                            <DatePickerFilter
                                label="To"
                                date={dateRange.to}
                                setDate={handleToChange}
                                minDate={dateRange.from}
                            />
                        </div>
                        <div className="flex w-full justify-end items-end">
                            <Button variant={'outline'} className={`${actionButtonClass} hover:text-gray-500`}>Cancel</Button>
                            <Button variant={'outline'} className={`${actionButtonClass} hover:text-primary-dark`}>Apply</Button>
                        </div>
                    </div>
                )
                }
                <div className="border border-slate-100 dark:border-gray-800 my-1"></div>
                <div className="flex flex-col p-2">
                    {["Today", "Last 7 days", "Last 30 days", `This year (${new Date().getFullYear()})`, "Custom Date Range"].map((label, index) => (
                        <Button
                            key={index}
                            variant="outline"
                            className="h-7 flex items-center justify-between border-none text-[12px] text-gray-700 dark:dark:bg-dark--theme-light"
                            onClick={() => {
                                label === 'Custom Date Range' && setIsVisible((prev) => !prev)
                                handlePresetClick(label)
                            }}>
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

export function DatePickerFilter({
    label,
    date,
    setDate,
    minDate,
    maxDate
}: {
    label: string;
    date: Date | null;
    setDate: (date: Date | null) => void;
    minDate?: Date | null;
    maxDate?: Date | null

}) {
    const isDateDisabled = React.useCallback((date: Date) => {
        if (minDate && date < minDate) return true;
        if (maxDate && date > maxDate) return true;
        return false;
    }, [minDate, maxDate]);

    return (
        <div>
            <DatePicker
                buttonVariant={'link'}
                className="dark:bg-dark--theme-light rounded-lg bg-white dark:text-gray-200"
                buttonClassName={'decoration-transparent flex items-center w-full h-[2.2em] bg-white dark:text-gray-200 dark:bg-dark--theme-light border-gray-300 justify-start text-left font-normal text-black  h-[2.2rem] border dark:border-slate-600 rounded-md'}
                customInput={<DatePickerInput date={date} label={label} />}
                mode="single"
                numberOfMonths={1}
                initialFocus
                defaultMonth={date ?? new Date()}
                selected={date ?? new Date()}
                onSelect={(selectedDate) => {
                    if (selectedDate && !isDateDisabled(selectedDate)) {
                        setDate(selectedDate);
                    }
                }}
                modifiersClassNames={{
                    disabled: 'text-[#6989AA] cursor-not-allowed',
                    selected: '!rounded-full bg-primary text-white',
                    today: '!rounded-full bg-[#BCCAD9] text-white'
                }}
                disabled={[
                    ...(minDate ? [{ before: minDate }] : []),
                    ...(maxDate ? [{ after: maxDate }] : [])
                ]}
            />
        </div>
    );
}
