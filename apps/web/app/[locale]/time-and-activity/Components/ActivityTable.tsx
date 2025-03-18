import { Avatar } from '@components/ui/avatar';
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ProgressBar from './progress-bar';

interface Member {
  id: string;
  name: string;
  avatarUrl?: string;
  trackedHours: string;
  earnings: string;
  activityLevel: number;
  project: string;
  task?: string;
}

interface ActivityPeriod {
  startDate: string;
  endDate: string;
  totalHours: string;
  totalEarnings: string;
  averageActivity: string;
  members: Member[];
}

import { ViewOption } from './time-activity-header';

interface ActivityTableProps {
  period: ActivityPeriod;
  viewOptions?: ViewOption[];
}

const ActivityTable: React.FC<ActivityTableProps> = ({ period, viewOptions = [] }) => {


  const columnVisibility = React.useMemo(() => {
    const visibilityMap = new Map(viewOptions.map(opt => [opt.id, opt.checked]));
    return {
      member: visibilityMap.get('member') ?? true,
      project: visibilityMap.get('project') ?? true,
      task: visibilityMap.get('task') ?? true,
      trackedHours: visibilityMap.get('trackedHours') ?? true,
      earnings: visibilityMap.get('earnings') ?? true,
      activityLevel: visibilityMap.get('activityLevel') ?? true
    };
  }, [viewOptions]);
  // Check if any columns are visible
  const hasVisibleColumns = Object.values(columnVisibility).some(visible => visible);

  if (!hasVisibleColumns) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 w-full min-h-[500px] text-gray-500 dark:text-gray-400">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400">
          <path d="M3 10H21M7 15H8M12 15H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p>Please select at least one column to display</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[500px]">
      {/* Period Header */}
      <div className="flex flex-col gap-2 px-6 py-3 bg-gray-50/50 dark:bg-dark--theme">
        <div className="text-sm text-gray-900 dark:text-gray-400">
          {period.startDate} - {period.endDate}
        </div>
        <div className="flex gap-6 items-center text-sm">
          <div className="flex gap-2 items-center">
            <span className="text-gray-500">Hours:</span>
            <span className="text-gray-900">{period.totalHours}</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-gray-500">Earnings:</span>
            <span className="text-gray-900">{period.totalEarnings}</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-gray-500">Average Activity:</span>
            <span className="text-gray-900">{period.averageActivity}</span>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="overflow-hidden rounded-md transition-all">
        {period.members.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 h-64 text-gray-500 dark:text-gray-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>No activity data available for this period</p>
          </div>
        ) : (
        <Table className="w-full">
          <TableHeader>
            <TableRow
              className="border-0 hover:bg-transparent dark:hover:bg-dark--theme-light"
              role="row"
            >
              {columnVisibility.member && (
                <TableHead className="px-6 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300">Member</TableHead>
              )}
              {columnVisibility.project && (
                <TableHead className="px-6 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300">Project</TableHead>
              )}
              {columnVisibility.task && (
                <TableHead className="px-6 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300">Task</TableHead>
              )}
              {columnVisibility.trackedHours && (
                <TableHead className="px-6 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300">Tracked Hours</TableHead>
              )}
              {columnVisibility.earnings && (
                <TableHead className="px-6 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300">Earnings</TableHead>
              )}
              {columnVisibility.activityLevel && (
                <TableHead className="px-6 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300">Activity Level</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {period.members.map((member) => (
              <TableRow
              key={member.id}
              className="border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
              role="row"
            >
                {columnVisibility.member && (
                  <TableCell className="px-6 py-3">
                    <div className="flex gap-3 items-center">
                      <Avatar className="w-8 h-8 ring-2 ring-offset-2 ring-transparent transition-all hover:ring-primary/20">
                        <img
                          src={member.avatarUrl || '/default-avatar.png'}
                          alt={member.name}
                          className="object-cover w-full h-full rounded-full"
                          loading="lazy"
                        />
                      </Avatar>
                      <span className="text-sm font-medium transition-colors hover:text-primary">{member.name}</span>
                    </div>
                  </TableCell>
                )}
                {columnVisibility.project && (
                  <TableCell className="px-6 py-3">
                    <div className="flex gap-2 items-center">
                      <div className="w-6 h-6 rounded-md bg-[#4B4ACF] flex items-center justify-center transition-transform hover:scale-110">
                        <img
                          src="/ever-teams-logo.png"
                          alt="Ever Teams"
                          className="w-4 h-4"
                          loading="lazy"
                        />
                      </div>
                      <span className="text-sm transition-colors hover:text-primary">{member.project}</span>
                    </div>
                  </TableCell>
                )}
                {columnVisibility.task && (
                  <TableCell className="px-6 py-3">
                    <span className="text-sm transition-colors hover:text-primary">{member.task || '-'}</span>
                  </TableCell>
                )}
                {columnVisibility.trackedHours && (
                  <TableCell className="px-6 py-3">
                    <div className="flex gap-2 items-center group">
                      <div className="w-2 h-2 bg-green-500 rounded-full transition-transform group-hover:scale-110" />
                      <span className="text-sm transition-colors group-hover:text-primary">{member.trackedHours}</span>
                    </div>
                  </TableCell>
                )}
                {columnVisibility.earnings && (
                  <TableCell className="px-6 py-3">
                    <span className="text-sm transition-colors hover:text-primary">{member.earnings}</span>
                  </TableCell>
                )}
                {columnVisibility.activityLevel && (
                  <TableCell className="px-6 py-3">
                    <div className="flex gap-3 items-center group">
                      <div className="flex-1 max-w-32 transition-opacity group-hover:opacity-80">
                        <ProgressBar
                          progress={member.activityLevel}
                          color="bg-[#0088CC]"
                        />
                      </div>
                      <span className="text-sm transition-colors group-hover:text-primary">{member.activityLevel}%</span>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </div>
    </div>
  );
};

export default ActivityTable;
