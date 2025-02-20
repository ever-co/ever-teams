'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@components/ui/card';
import { format } from 'date-fns';
import { IActivityReport, IActivityReportGroupByDate, IActivityItem } from '@app/interfaces/activity/IActivityReport';
import React from 'react';

export function ProductivityProjectTable({
  data,
  isLoading
}: {
  data?: IActivityReport[];
  isLoading?: boolean;
}) {
  const reportData = data as IActivityReportGroupByDate[] | undefined;

  if (isLoading) {
    return (
      <Card className="bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Member</TableHead>
              <TableHead className="font-semibold">Application</TableHead>
              <TableHead className="font-semibold">Time Spent</TableHead>
              <TableHead className="font-semibold">Percent used</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(7)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="w-32 h-4"/></TableCell>
                <TableCell>
                  <div className="flex gap-2 items-center">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="w-24 h-4" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="w-24 h-4"/></TableCell>
                <TableCell><Skeleton className="w-16 h-4"/></TableCell>
                <TableCell><Skeleton className="w-24 h-4"/></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  if (!reportData || reportData.length === 0) {
    return (
      <Card className="bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px] flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">No activity data available</p>
          <p className="text-sm">Select a different date range or check back later</p>
        </div>
      </Card>
    );
  }

  // Group data by project and date
  const projectGroups = reportData.reduce((projectAcc, dayData) => {
    dayData.employees.forEach((employeeData: any) => {
      const activities = employeeData.projects?.[0]?.activity || employeeData.activity || [];
      activities.forEach((activity: IActivityItem) => {
        const projectName = activity.projectId || 'Ever Teams';
        if (!projectAcc[projectName]) {
          projectAcc[projectName] = {};
        }

        if (!projectAcc[projectName][dayData.date]) {
          projectAcc[projectName][dayData.date] = {
            activities: [],
            totalDuration: 0,
            members: new Set()
          };
        }

        const dateGroup = projectAcc[projectName][dayData.date];
        dateGroup.activities.push({
          employee: employeeData.employee || employeeData,
          activity
        });
        dateGroup.totalDuration += (activity.duration as number);
        dateGroup.members.add((employeeData.employee || employeeData).id);
      });
    });
    return projectAcc;
  }, {} as Record<string, Record<string, {
    activities: Array<{employee: any; activity: IActivityItem}>;
    totalDuration: number;
    members: Set<string>;
  }>>);

  return (
    <Card className="bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px]">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-gray-800">
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Member</TableHead>
            <TableHead className="font-semibold">Application</TableHead>
            <TableHead className="font-semibold">Time Spent</TableHead>
            <TableHead className="font-semibold">Percent used</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(projectGroups).map(([projectName, dateGroups]) => (
            <React.Fragment key={projectName}>
              <TableRow className="bg-gray-50/50">
                <TableCell colSpan={5} className="py-2">
                  <div className="flex gap-2 items-center">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src="/ever-teams-logo.svg" alt={projectName} />
                      <AvatarFallback>{projectName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{projectName}</span>
                  </div>
                </TableCell>
              </TableRow>
              {Object.entries(dateGroups).map(([date, { activities }]) => (
                <React.Fragment key={`${projectName}-${date}`}>
                  {/* Date row */}
                  <TableRow className="bg-gray-50/30">
                    <TableCell>{format(new Date(date), 'EEEE dd MMM yyyy')}</TableCell>
                    <TableCell colSpan={4}>
                      <div className="flex gap-2 items-center text-sm text-gray-500">
                        {activities.length} activities • {Array.from(new Set(activities.map(a => a.employee.id))).length} members
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Activity details rows */}
                  {activities.map(({ employee, activity }, idx) => (
                    <TableRow key={`${employee.id}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell></TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          <Avatar className="w-8 h-8">
                            {employee?.user?.imageUrl && (
                              <AvatarImage
                                src={employee.user.imageUrl}
                                alt={employee.fullName}
                              />
                            )}
                            <AvatarFallback>
                              {employee?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{employee.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{activity.title}</TableCell>
                      <TableCell>{formatDuration(activity.duration.toString())}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          <div className="overflow-hidden w-24 h-2 bg-gray-200 rounded-full">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${parseFloat(activity.duration_percentage)}%` }}
                            />
                          </div>
                          <span>{Math.round(parseFloat(activity.duration_percentage))}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Summary row */}
                  <TableRow className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/20">
                    <TableCell></TableCell>
                    <TableCell colSpan={2} className="text-sm text-gray-500">
                      Total for {format(new Date(date), 'MMM dd')}
                    </TableCell>
                    <TableCell>
                      {formatDuration(
                        activities
                          .reduce((sum, { activity }) => sum + (activity.duration as number), 0)
                          .toString()
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        <div className="overflow-hidden w-24 h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${activities.reduce((sum, { activity }) => sum + parseFloat(activity.duration_percentage), 0)}%` }}
                          />
                        </div>
                        <span>{Math.round(activities.reduce((sum, { activity }) => sum + parseFloat(activity.duration_percentage), 0))}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function formatDuration(seconds: string): string {
  const totalSeconds = parseInt(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}
