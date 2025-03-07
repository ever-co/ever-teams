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
}

interface ActivityPeriod {
  startDate: string;
  endDate: string;
  totalHours: string;
  totalEarnings: string;
  averageActivity: string;
  members: Member[];
}

interface ActivityTableProps {
  period: ActivityPeriod;
}

const ActivityTable: React.FC<ActivityTableProps> = ({ period }) => {
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
      <div className="overflow-hidden rounded-m">
        <Table>
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className="px-6 py-2 text-xs font-medium text-gray-500">Member</TableHead>
              <TableHead className="px-6 py-2 text-xs font-medium text-gray-500">Project</TableHead>
              <TableHead className="px-6 py-2 text-xs font-medium text-gray-500">Tracked Hours</TableHead>
              <TableHead className="px-6 py-2 text-xs font-medium text-gray-500">Earnings</TableHead>
              <TableHead className="px-6 py-2 text-xs font-medium text-gray-500">Activity Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {period.members.map((member) => (
              <TableRow key={member.id} className="border-0 hover:bg-gray-50/50">
                <TableCell className="px-6 py-3">
                  <div className="flex gap-3 items-center">
                    <Avatar className="w-8 h-8">
                      <img
                        src={member.avatarUrl || '/default-avatar.png'}
                        alt={member.name}
                        className="object-cover w-full h-full rounded-full"
                      />
                    </Avatar>
                    <span className="text-sm font-medium">{member.name}</span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-3">
                  <div className="flex gap-2 items-center">
                    <div className="w-6 h-6 rounded-md bg-[#4B4ACF] flex items-center justify-center">
                      <img
                        src="/ever-teams-logo.png"
                        alt="Ever Teams"
                        className="w-4 h-4"
                      />
                    </div>
                    <span className="text-sm">{member.project}</span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-3">
                  <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm">{member.trackedHours}</span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-3 text-sm">{member.earnings}</TableCell>
                <TableCell className="px-6 py-3">
                  <div className="flex gap-3 items-center">
                    <div className="flex-1 max-w-32">
                      <ProgressBar
                        progress={member.activityLevel}
                        color="bg-primary"
                      />
                    </div>
                    <span className="text-sm">{member.activityLevel}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ActivityTable;
