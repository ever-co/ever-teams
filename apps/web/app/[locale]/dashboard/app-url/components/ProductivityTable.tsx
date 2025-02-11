'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/lib/components';

interface AppUsageData {
  member: {
    name: string;
    avatarUrl?: string;
  };
  project?: string;
  application?: string;
  timeSpent?: string;
  percentUsed: number;
}

export function ProductivityTable({
  data,
  isLoading
}: {
  data?: AppUsageData[];
  isLoading?: boolean;
}) {
  const sampleData: AppUsageData[] = [
    {
      member: {
        name: 'Elanor Pena',
        avatarUrl: '/avatars/elanor.jpg'
      },
      project: 'EverTeams',
      application: 'Figma',
      timeSpent: '03:46:11',
      percentUsed: 60
    },
    {
      member: {
        name: 'Elanor Pena',
        avatarUrl: '/avatars/elanor.jpg'
      },
      project: 'EverTeams',
      application: 'Slack',
      timeSpent: '1:17:02',
      percentUsed: 20
    },
    {
      member: {
        name: 'Elanor Pena',
        avatarUrl: '/avatars/elanor.jpg'
      },
      project: 'EverTeams',
      application: 'Arc',
      timeSpent: '46:44',
      percentUsed: 15
    },
    {
      member: {
        name: 'Elanor Pena',
        avatarUrl: '/avatars/elanor.jpg'
      },
      project: 'EverTeams',
      application: 'Postman',
      timeSpent: '12:54',
      percentUsed: 5
    }
  ];

  // Use sample data for now
  const displayData = sampleData;

  if (isLoading) {
    return (
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
            {[...Array(4)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex gap-2 items-center">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="w-24 h-4" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="w-24 h-4" /></TableCell>
                <TableCell><Skeleton className="w-16 h-4" /></TableCell>
                <TableCell><Skeleton className="w-16 h-4" /></TableCell>
                <TableCell><Skeleton className="w-24 h-4" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    );
  }

  return (
    <Card shadow="custom" className="rounded-md border bg-white border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[403px]">
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
          {displayData?.map((item, index) => (
            <TableRow key={index}>
              <TableCell>
                <div className="flex gap-2 items-center">
                  <Avatar className="w-8 h-8">
                    {item.member.avatarUrl && (
                      <AvatarImage src={item.member.avatarUrl} alt={item.member.name} />
                    )}
                    <AvatarFallback>
                      {item.member.name.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span>{item.member.name}</span>
                </div>
              </TableCell>
              <TableCell>{item.project}</TableCell>
              <TableCell>{item.application}</TableCell>
              <TableCell>{item.timeSpent}</TableCell>
              <TableCell>
                <div className="flex gap-2 items-center">
                  <div className="overflow-hidden w-24 h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${item.percentUsed}%` }}
                    />
                  </div>
                  <span>{item.percentUsed}%</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
