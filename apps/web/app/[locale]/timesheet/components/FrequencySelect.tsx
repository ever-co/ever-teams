import React from "react";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { Button } from "lib/components/button";

export function FrequencySelect() {
    const [selectedValue, setSelectedValue] = React.useState<string | undefined>(undefined);

    const handleSelectChange = (value: string) => {
        setSelectedValue(value);
    };

    return (
        <Select
            value={selectedValue}
            onValueChange={handleSelectChange}>
            <SelectTrigger className="w-[180px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark--theme-light focus:ring-2 focus:ring-transparent">
                <SelectValue placeholder="Select a daily" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}




export const FilterTaskActionMenu = () => {
    // const handleCopyPaymentId = () => navigator.clipboard.writeText(idTasks);
    return (
        <DropdownMenu open={true} >
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0  text-sm sm:text-base">
                    {/* <span className="sr-only">Open menu</span> */}
                    <span>Today</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50">
                <DropdownMenuItem className="cursor-pointer" >
                    Today
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" >
                    Last 7 days
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" >
                    Last 30 days
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" >
                    This year (2024)
                    {/* ({new Date().getFullYear()}) */}
                </DropdownMenuItem>
                {/* <DropdownMenuSeparator /> */}
                <CustomDateRange />
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export const CustomDateRange = () => {
    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <span>Custom Date Range</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <DropdownMenuItem className="cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="h-1 w-1 rounded-full bg-black dark:bg-white"></div>
                            <span>Calendar</span>
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
        </DropdownMenuSub>
    )
}
