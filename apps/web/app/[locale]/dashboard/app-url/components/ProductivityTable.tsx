'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@components/ui/card';
import { format } from 'date-fns';
import { IActivityReport, IActivityReportGroupByDate, IActivityItem } from '@app/interfaces/activity/IActivityReport';
import React from 'react';

export function ProductivityTable({
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
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>Time Spent</TableHead>
              <TableHead>Percent used</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(7)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex gap-2 items-center">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="w-24 h-4" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="w-24 h-4"/></TableCell>
                <TableCell><Skeleton className="w-16 h-4"/></TableCell>
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

  return (
    <Card className="bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Application</TableHead>
            <TableHead>Time Spent</TableHead>
            <TableHead>Percent used</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reportData.map((dayData) => {
            const employeeActivities = new Map<string, { employee: any; activities: IActivityItem[] }>();
            dayData.employees.forEach(employeeData => {
              employeeData.projects[0]?.activity.forEach((activity: IActivityItem) => {
                const employeeId = activity.employee.id;
                if (!employeeActivities.has(employeeId)) {
                  employeeActivities.set(employeeId, {
                    employee: activity.employee,
                    activities: []
                  });
                }
                employeeActivities.get(employeeId)?.activities.push(activity);
              });
            });

            const hasActivities = Array.from(employeeActivities.values()).some(({ activities }) => activities.length > 0);

            if (!hasActivities) {
              return (
                <React.Fragment key={dayData.date}>
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-4 font-medium bg-gray-50 dark:bg-gray-800">
                      {format(new Date(dayData.date), 'EEEE dd MMM yyyy')}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} className="py-4 text-center text-gray-500 dark:text-gray-400">
                      No activities recorded for this day
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={dayData.date}>
                <TableRow>
                  <TableCell colSpan={5} className="px-6 py-4 font-medium bg-gray-50 dark:bg-gray-800">
                    {format(new Date(dayData.date), 'EEEE dd MMM yyyy')}
                  </TableCell>
                </TableRow>
                {Array.from(employeeActivities.values()).map(({ employee, activities }) => (
                  activities.map((activity, index) => (
                    <TableRow key={`${employee.id}-${index}`}>
                      {index === 0 && (
                        <TableCell className="align-top" rowSpan={activities.length}>
                          <div className="flex gap-2 items-center">
                            <Avatar className="w-8 h-8">
                              {employee.user.imageUrl && (
                                <AvatarImage
                                  src={employee.user.imageUrl}
                                  alt={employee.fullName}
                                />
                              )}
                              <AvatarFallback>
                                {employee.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{employee.fullName}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>Ever Teams</TableCell>
                      <TableCell>{activity.title}</TableCell>
                      <TableCell>{formatDuration(activity.duration.toString())}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          <div className="overflow-hidden w-24 h-2 bg-gray-200 rounded-full">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${activity.duration_percentage}%` }}
                            />
                          </div>
                          <span>{Math.round(parseFloat(activity.duration_percentage))}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ))}
              </React.Fragment>
            );
          })}
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
