"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "./date-range-picker";
import { DateRange } from "react-day-picker";
import { ITimeLogReportDailyChartProps } from "@/app/interfaces/timer/ITimerLog";

interface DashboardHeaderProps {
	onUpdateDateRange: (startDate: Date, endDate: Date) => void;
	onUpdateFilters: (filters: Partial<Omit<ITimeLogReportDailyChartProps, 'organizationId' | 'tenantId'>>) => void;
}

export function DashboardHeader({ onUpdateDateRange, onUpdateFilters }: DashboardHeaderProps) {
	const handleDateRangeChange = (range: DateRange | undefined) => {
		if (range?.from && range?.to) {
			onUpdateDateRange(range.from, range.to);
		}
	};

	const handleFilterChange = (value: string) => {
		const today = new Date();
		let startDate = new Date();
		const endDate = today;

		switch (value) {
			case 'today':
				startDate = today;
				break;
			case 'week':
				startDate.setDate(today.getDate() - 7);
				break;
			case 'month':
				startDate.setMonth(today.getMonth() - 1);
				break;
			default:
				return;
		}

		onUpdateDateRange(startDate, endDate);
	};

	return (
		<div className="flex justify-between items-center">
			<h1 className="text-2xl font-semibold">Team Dashboard</h1>
			<div className="flex gap-4 items-center">
				<DateRangePicker onDateRangeChange={handleDateRangeChange} />
				<Select defaultValue="filter" onValueChange={handleFilterChange}>
					<SelectTrigger className="w-[100px]">
						<SelectValue placeholder="Filter" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="filter">Filter</SelectItem>
						<SelectItem value="today">Today</SelectItem>
						<SelectItem value="week">This Week</SelectItem>
						<SelectItem value="month">This Month</SelectItem>
					</SelectContent>
				</Select>
				<Select defaultValue="export">
					<SelectTrigger className="w-[100px]">
						<SelectValue placeholder="Export" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="export">Export</SelectItem>
						<SelectItem value="csv">CSV</SelectItem>
						<SelectItem value="pdf">PDF</SelectItem>
						<SelectItem value="excel">Excel</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
