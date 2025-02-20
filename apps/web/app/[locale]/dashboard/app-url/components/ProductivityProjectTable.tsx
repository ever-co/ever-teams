'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@components/ui/card';
import { format } from 'date-fns';
import { IActivityReport, IActivityReportGroupByDate, IActivityItem } from '@app/interfaces/activity/IActivityReport';
import React from 'react';

interface ProjectGroupData {
  activities: Array<{employee: any; activity: IActivityItem}>;
  totalDuration: number;
  members: Set<string>;
}

interface ProjectGroups {
  [projectName: string]: {
    [date: string]: ProjectGroupData;
  };
}

interface ActivityRowProps {
  employee: any;
  activity: IActivityItem;
}

interface DateSummaryRowProps {
  date: string;
  activities: Array<{employee: any; activity: IActivityItem}>;
}

interface ProjectHeaderRowProps {
  projectName: string;
}

interface DateHeaderRowProps {
  date: string;
  activities: Array<{employee: any; activity: IActivityItem}>;
}

const ActivityRow: React.FC<ActivityRowProps> = ({ employee, activity }) => (
  <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800">
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
      <ProgressBar percentage={parseFloat(activity.duration_percentage)} />
    </TableCell>
  </TableRow>
);

const ProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => (
  <div className="flex gap-2 items-center">
    <div className="overflow-hidden w-24 h-2 bg-gray-200 rounded-full">
      <div
        className="h-full bg-blue-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
    <span>{Math.round(percentage)}%</span>
  </div>
);

const DateSummaryRow: React.FC<DateSummaryRowProps> = ({ date, activities }) => {
  const totalDuration = activities.reduce((sum, { activity }) => sum + (activity.duration as number), 0);
  const totalPercentage = activities.reduce((sum, { activity }) => sum + parseFloat(activity.duration_percentage), 0);

  return (
    <TableRow className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/20">
      <TableCell></TableCell>
      <TableCell colSpan={2} className="text-sm text-gray-500">
        Total for {format(new Date(date), 'MMM dd')}
      </TableCell>
      <TableCell>{formatDuration(totalDuration.toString())}</TableCell>
      <TableCell>
        <ProgressBar percentage={totalPercentage} />
      </TableCell>
    </TableRow>
  );
};

const ProjectHeaderRow: React.FC<ProjectHeaderRowProps> = ({ projectName }) => (
  <TableRow className="bg-gray-50/50 dark:bg-gray-800">
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
);

const DateHeaderRow: React.FC<DateHeaderRowProps> = ({ date, activities }) => (
  <TableRow className="bg-gray-50/30">
    <TableCell>{format(new Date(date), 'EEEE dd MMM yyyy')}</TableCell>
    <TableCell colSpan={4}>
      <div className="flex gap-2 items-center text-sm text-gray-500">
        {activities.length} activities • {Array.from(new Set(activities.map(a => a.employee.id))).length} members
      </div>
    </TableCell>
  </TableRow>
);

const LoadingSkeleton: React.FC = () => (
  <Card className="bg-white rounded-md border border-gray-100 dark:border-gray-800 dark:bg-dark--theme-light min-h-[600px] w-full">
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

const EmptyState: React.FC = () => (
  <Card className="bg-white rounded-md border border-gray-100 dark:border-gray-800 dark:bg-dark--theme-light min-h-[600px] flex items-center justify-center w-full">
    <div className="text-center text-gray-500 dark:text-gray-400">
      <p className="text-lg font-medium">No activity data available</p>
      <p className="text-sm">Select a different date range or check back later</p>
    </div>
  </Card>
);

function formatDuration(seconds: string): string {
  const totalSeconds = parseInt(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

const groupActivitiesByProjectAndDate = (reportData: IActivityReportGroupByDate[]): ProjectGroups => {
  return reportData.reduce((projectAcc, dayData) => {
    dayData.employees.forEach((employeeData: any) => {
      const activities = employeeData.projects?.[0]?.activity || employeeData.activity || [];
      activities.forEach((activity: IActivityItem) => {
        const projectName = activity.projectId || 'No project';
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
  }, {} as ProjectGroups);
};

export function ProductivityProjectTable({
  data,
  isLoading
}: {
  data?: IActivityReport[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const reportData = data as IActivityReportGroupByDate[] | undefined;
  
  if (!reportData || reportData.length === 0) {
    return <EmptyState />;
  }

  const projectGroups = groupActivitiesByProjectAndDate(reportData);

  return (
    <Card className="bg-white rounded-md border border-gray-100 dark:border-gray-800 dark:bg-dark--theme-light min-h-[600px] w-full">
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
              <ProjectHeaderRow projectName={projectName} />
              {Object.entries(dateGroups).map(([date, { activities }]) => (
                <React.Fragment key={`${projectName}-${date}`}>
                  <DateHeaderRow date={date} activities={activities} />
                  {activities.map(({ employee, activity }, idx) => (
                    <ActivityRow
                      key={`${employee.id}-${idx}`}
                      employee={employee}
                      activity={activity}
                    />
                  ))}
                  <DateSummaryRow date={date} activities={activities} />
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
