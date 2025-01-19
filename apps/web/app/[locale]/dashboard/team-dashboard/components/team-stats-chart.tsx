"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";

const data = [
	{ date: "Oct. 01 2024", tracked: 14, manual: 5, idle: 1 },
	{ date: "Oct. 02 2024", tracked: 8, manual: 4, idle: 1 },
	{ date: "Oct. 03 2024", tracked: 10, manual: 3, idle: 1 },
	{ date: "Oct. 04 2024", tracked: 9, manual: 2, idle: 1 },
	{ date: "Oct. 05 2024", tracked: 6, manual: 2, idle: 1 },
	{ date: "Oct. 06 2024", tracked: 4, manual: 2, idle: 0 },
	{ date: "Oct. 07 2024", tracked: 3, manual: 1, idle: 0 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
	if (active && payload && payload.length) {
		return (
			<div className="p-4 bg-white rounded-lg border shadow-lg">
				<p className="mb-2 text-gray-600">{label}</p>
				{payload.map((entry: any) => (
					<p key={entry.name} style={{ color: entry.color }}>
						{entry.name}: {entry.value}
					</p>
				))}
			</div>
		);
	}
	return null;
};

export function TeamStatsChart() {
	return (
		<div className="flex flex-col">
			<div className="h-[400px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
						<CartesianGrid
							stroke="#e5e7eb"
							vertical={true}
							horizontal={true}
						/>
						<XAxis
							dataKey="date"
							stroke="#888888"
							fontSize={12}
							tickLine={false}
							axisLine={false}
							padding={{ left: 10, right: 10 }}
						/>
						<YAxis
							stroke="#888888"
							fontSize={12}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value) => `${value}`}
							padding={{ top: 10, bottom: 10 }}
							tickCount={8}
						/>
						<Tooltip content={<CustomTooltip />} />
						<Line
							type="monotone"
							dataKey="tracked"
							stroke="#2563eb"
							strokeWidth={2}
							dot={{ fill: "#2563eb", r: 4 }}
							activeDot={{ r: 6, fill: "#2563eb" }}
						/>
						<Line
							type="monotone"
							dataKey="manual"
							stroke="#dc2626"
							strokeWidth={2}
							dot={{ fill: "#dc2626", r: 4 }}
							activeDot={{ r: 6, fill: "#dc2626" }}
						/>
						<Line
							type="monotone"
							dataKey="idle"
							stroke="#eab308"
							strokeWidth={2}
							dot={{ fill: "#eab308", r: 4 }}
							activeDot={{ r: 6, fill: "#eab308" }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
			<div className="flex gap-3 justify-center -mt-2">
				<Button
					size="sm"
					variant="outline"
					className="gap-2 px-3 py-1.5 h-8 text-xs font-normal hover:bg-transparent hover:text-inherit"
				>
					<div className="w-2 h-2 bg-blue-500 rounded-full" />
					Tracked
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="gap-2 px-3 py-1.5 h-8 text-xs font-normal hover:bg-transparent hover:text-inherit"
				>
					<div className="w-2 h-2 bg-red-500 rounded-full" />
					Manual
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="gap-2 px-3 py-1.5 h-8 text-xs font-normal hover:bg-transparent hover:text-inherit"
				>
					<div className="w-2 h-2 bg-yellow-500 rounded-full" />
					Idle
				</Button>
			</div>
		</div>
	);
}
