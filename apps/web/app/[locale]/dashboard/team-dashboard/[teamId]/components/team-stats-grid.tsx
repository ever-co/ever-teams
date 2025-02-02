"use client";

import { Card } from "@/components/ui/card";

const stats = [
	{
		title: "Members worked",
		value: "17",
		type: "number"
	},
	{
		title: "Tracked",
		value: "47:23",
		type: "time",
		color: "text-blue-500",
		progress: 70,
		progressColor: "bg-blue-500"
	},
	{
		title: "Manual",
		value: "18:33",
		type: "time",
		color: "text-red-500",
		progress: 30,
		progressColor: "bg-red-500"
	},
	{
		title: "Idle",
		value: "05:10",
		type: "time",
		color: "text-yellow-500",
		progress: 10,
		progressColor: "bg-yellow-500"
	},
	{
		title: "Total Hours",
		value: "70:66",
		type: "time"
	}
];

export function TeamStatsGrid() {
	return (
		<>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
				{stats.map((stat) => (
					<Card key={stat.title} className="p-6 dark:bg-dark--theme-light">
						<div className="flex flex-col">
							<span className="text-sm font-medium text-gray-500">{stat.title}</span>
							<span className={`text-2xl font-semibold mt-2 ${stat.color || "text-gray-900 dark:text-white"}`}>
								{stat.value}
							</span>
							{stat.progress && (
								<div className="mt-4">
									<div className="w-full h-2 bg-gray-100 rounded-full">
										<div
											className={`h-full rounded-full ${stat.progressColor}`}
											style={{ width: `${stat.progress}%` }}
										/>
									</div>
								</div>
							)}
						</div>
					</Card>
				))}
			</div>
		</>
	);
}
