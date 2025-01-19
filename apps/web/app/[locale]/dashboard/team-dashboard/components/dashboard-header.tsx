"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export function DashboardHeader() {
	return (
		<div className="flex justify-between items-center">
			<h1 className="text-2xl font-semibold">Team Dashboard</h1>
			<div className="flex gap-4 items-center">
				<Button variant="outline" className="gap-2">
					Oct 1-7 2024
					<ChevronDown className="w-4 h-4" />
				</Button>
				<Select defaultValue="filter">
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
