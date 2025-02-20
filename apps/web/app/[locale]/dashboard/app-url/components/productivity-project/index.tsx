import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { IActivityReport, IActivityReportGroupByDate } from '@/app/interfaces/activity/IActivityReport';
import React from 'react';
import { ActivityRow, DateHeaderRow, DateSummaryRow, ProjectHeaderRow } from './components';
import { EmptyState, LoadingSkeleton } from './states';
import { groupActivitiesByProjectAndDate } from './utils';

interface ProductivityProjectTableProps {
  data?: IActivityReport[];
  isLoading?: boolean;
}

export const ProductivityProjectTable: React.FC<ProductivityProjectTableProps> = ({
  data,
  isLoading
}) => {
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
};
