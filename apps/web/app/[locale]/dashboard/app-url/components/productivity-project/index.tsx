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
import { ActivityRow, DateHeaderRow, ProjectHeaderRow } from './components';
import { EmptyState, LoadingSkeleton } from './states';
import { groupActivitiesByProjectAndDate } from './utils';
import { useTranslations } from 'next-intl';

interface ProductivityProjectTableProps {
  data?: IActivityReport[];
  isLoading?: boolean;
}

export const ProductivityProjectTable: React.FC<ProductivityProjectTableProps> = ({
  data,
  isLoading
}) => {
  const t=useTranslations();
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const reportData = data as IActivityReportGroupByDate[] | undefined;

  if (!reportData || reportData.length === 0) {
    return <EmptyState t={t} />;
  }

  const projectGroups = groupActivitiesByProjectAndDate(reportData);

  return (
    <Card className="bg-white rounded-md border border-gray-100 dark:border-gray-800 dark:bg-dark--theme-light min-h-[600px] w-full">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-gray-800">
            <TableHead className="font-semibold">{t('common.DATE')}</TableHead>
            <TableHead className="font-semibold">{t('common.MEMBER')}</TableHead>
            <TableHead className="font-semibold">{t('common.APPLICATION')}</TableHead>
            <TableHead className="font-semibold">{t('common.TIME_SPENT')}</TableHead>
            <TableHead className="font-semibold">{t('common.PERCENT_USED')}</TableHead>
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
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
