import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {  ChevronsUpDown } from 'lucide-react';

export type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

interface SortPopoverProps<T> {
  label: string;
  sortKey: string;
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig, sortedData: T[]) => void;
  data: T[];
  sortFunction: (a: T, b: T) => number;
}

export function SortPopover<T>({
  label,
  sortKey,
  sortConfig,
  onSortChange,
  data,
  sortFunction
}: SortPopoverProps<T>) {
  const handleSort = (direction: 'asc' | 'desc') => {
    const newConfig = { key: sortKey, direction };
    const sortedData = [...data].sort((a, b) => {
      const comparison = sortFunction(a, b);
      return direction === 'asc' ? comparison : -comparison;
    });
    onSortChange(newConfig, sortedData);
  };
  return (
    <div className="flex gap-2 items-center">
      {label}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="w-4 h-4 hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronsUpDown />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-2 w-28">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="justify-start text-[12px]"
              onClick={() => handleSort('asc')}
            >
              ASC
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-[12px]"
              onClick={() => handleSort('desc')}
            >
              DESC
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
