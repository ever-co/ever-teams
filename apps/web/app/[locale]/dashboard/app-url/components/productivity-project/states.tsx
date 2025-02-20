import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export const LoadingSkeleton: React.FC = () => (
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

export const EmptyState: React.FC = () => (
  <Card className="bg-white rounded-md border border-gray-100 dark:border-gray-800 dark:bg-dark--theme-light min-h-[600px] flex items-center justify-center w-full">
    <div className="text-center text-gray-500 dark:text-gray-400">
      <p className="text-lg font-medium">No activity data available</p>
      <p className="text-sm">Select a different date range or check back later</p>
    </div>
  </Card>
);
