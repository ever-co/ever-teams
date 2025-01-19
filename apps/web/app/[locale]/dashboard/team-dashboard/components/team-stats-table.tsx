"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const getProgressColor = (activityLevel: string) => {
	const level = parseInt(activityLevel);
	if (level <= 20) return "bg-red-500";
	if (level <= 50) return "bg-yellow-500";
	return "bg-green-500";
};

const members = [
	{
		name: "Elanor Pena",
		avatar: "/avatars/01.png",
		totalTime: "58 min",
		tracked: "58%",
		manuallyAdded: "0%",
		activeTime: "100%",
		idleTime: "0%",
		unknownActivity: "0%",
		activityLevel: "65%",
		date: "Monday 07 Oct 2024"
	},
	{
		name: "Eren Yeger",
		avatar: "/avatars/02.png",
		totalTime: "58 min",
		tracked: "58%",
		manuallyAdded: "0%",
		activeTime: "100%",
		idleTime: "0%",
		unknownActivity: "0%",
		activityLevel: "38%",
		date: "Monday 07 Oct 2024"
	},
	{
		name: "Samuel Robery",
		avatar: "/avatars/03.png",
		totalTime: "58 min",
		tracked: "58%",
		manuallyAdded: "0%",
		activeTime: "100%",
		idleTime: "0%",
		unknownActivity: "0%",
		activityLevel: "65%",
		date: "Monday 07 Oct 2024"
	},
	{
		name: "Dany Downso",
		avatar: "/avatars/04.png",
		totalTime: "58 min",
		tracked: "58%",
		manuallyAdded: "0%",
		activeTime: "100%",
		idleTime: "0%",
		unknownActivity: "0%",
		activityLevel: "14%",
		date: "Monday 07 Oct 2024"
	},
];

export function TeamStatsTable() {
	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div className="space-y-1">
					<h2 className="text-2xl font-semibold tracking-tight">Members Activity</h2>
					<p className="text-sm text-gray-500">
						An overview of team members activity and time tracking
					</p>
				</div>
			</div>
			<div className="overflow-auto relative w-full">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Member</TableHead>
							<TableHead>Total Time</TableHead>
							<TableHead>Tracked</TableHead>
							<TableHead>Manually Added</TableHead>
							<TableHead>Active Time</TableHead>
							<TableHead>Idle Time</TableHead>
							<TableHead>Unknown Activity</TableHead>
							<TableHead>Activity Level</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{members.map((member) => (
							<TableRow key={member.name}>
								<TableCell className="font-medium">
									<div className="flex gap-2 items-center">
										<Avatar className="w-8 h-8">
											<AvatarImage src={member.avatar} alt={member.name} />
											<AvatarFallback>{member.name[0]}</AvatarFallback>
										</Avatar>
										{member.name}
									</div>
								</TableCell>
								<TableCell>{member.totalTime}</TableCell>
								<TableCell>{member.tracked}</TableCell>
								<TableCell>{member.manuallyAdded}</TableCell>
								<TableCell>{member.activeTime}</TableCell>
								<TableCell>{member.idleTime}</TableCell>
								<TableCell>{member.unknownActivity}</TableCell>
								<TableCell>
									<div className="flex gap-2 items-center">
										<div className="w-full h-2 bg-gray-100 rounded-full">
											<div
												className={`h-full rounded-full ${getProgressColor(member.activityLevel)}`}
												style={{ width: member.activityLevel }}
											/>
										</div>
										<span className="w-9 text-sm">{member.activityLevel}</span>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
			<div className="flex justify-between items-center px-2">
				<div className="flex items-center space-x-6">
					<p className="text-sm text-gray-500">
						Showing 1 to 10 of 50 entries
					</p>
				</div>
				<div className="flex items-center space-x-2">
					<Button variant="outline" size="icon" disabled>
						<ChevronsLeft className="w-4 h-4" />
					</Button>
					<Button variant="outline" size="icon" disabled>
						<ChevronLeft className="w-4 h-4" />
					</Button>
					<Button variant="outline" size="sm">1</Button>
					<Button variant="outline" size="sm">2</Button>
					<Button variant="outline" size="sm">3</Button>
					<Button variant="outline" size="icon">
						<ChevronRight className="w-4 h-4" />
					</Button>
					<Button variant="outline" size="icon">
						<ChevronsRight className="w-4 h-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
