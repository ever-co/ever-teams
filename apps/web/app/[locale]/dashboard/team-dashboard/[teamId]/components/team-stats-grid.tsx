"use client";

import { ITimesheetStatisticsData } from "@/app/interfaces";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function formatDuration(seconds: number | undefined): string {
    if (!seconds) return "00:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function formatPercentage(value: number | undefined): number {
    if (!value) return 0;
    return Math.round(value);
}

export function TeamStatsGrid({
    statisticsCounts,
    loadingTimesheetStatisticsCounts
}: {
    statisticsCounts: ITimesheetStatisticsData | null;
    loadingTimesheetStatisticsCounts: boolean;
}) {
    const stats = [
        {
            title: "Members worked",
            value: statisticsCounts?.employeesCount?.toString() || "0",
            type: "number"
        },
        {
            title: "Tracked",
            value: formatDuration(statisticsCounts?.weekDuration),
            type: "time",
            color: "text-blue-500",
            progress: formatPercentage(statisticsCounts?.weekActivities),
            progressColor: "bg-blue-500"
        },
        {
            title: "Manual",
            value: formatDuration(statisticsCounts?.todayDuration),
            type: "time",
            color: "text-red-500",
            progress: formatPercentage(statisticsCounts?.todayActivities),
            progressColor: "bg-red-500"
        },
        {
            title: "Idle",
            value: formatDuration(statisticsCounts?.weekDuration),
            type: "time",
            color: "text-yellow-500",
            progress: formatPercentage(100),
            progressColor: "bg-yellow-500"
        },
        {
            title: "Total Hours",
            value: formatDuration(statisticsCounts?.todayDuration),
            type: "time",
            color: "text-green-500",
            progress: formatPercentage(100),
            progressColor: "bg-green-500"
        }
    ];

    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {stats.map((stat) => (
                    <Card key={stat.title} className="p-6">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-500">
                                {stat.title}
                            </span>
                            <div className="mt-2 h-9">
                                {loadingTimesheetStatisticsCounts ? (
                                    <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                                ) : (
                                    <span className={`text-2xl font-semibold ${stat.color || "text-gray-900 dark:text-white"}`}>
                                        {stat.value}
                                    </span>
                                )}
                            </div>
                            <div className="mt-4">
                                <div className="w-full h-2 bg-gray-100 rounded-full">
                                    <div
                                        className={`h-full rounded-full ${stat.progressColor} transition-all duration-300`}
                                        style={{ width: `${loadingTimesheetStatisticsCounts ? 0 : stat.progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </>
    );
}
