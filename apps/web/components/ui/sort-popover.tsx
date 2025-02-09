import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

type SortDirection = 'asc' | 'desc' | null;

interface SortPopoverProps<T> {
  label: string;
  field: keyof T;
  data: T[];
  onChange: (sortedData: T[]) => void;
  sortFn?: (a: T, b: T, field: keyof T) => number;
}

export function SortPopover<T>({
  label,
  field,
  data,
  onChange,
  sortFn
}: SortPopoverProps<T>) {
  const [direction, setDirection] = useState<SortDirection>(null);

  const handleSort = (newDirection: 'asc' | 'desc') => {
    setDirection(newDirection);

    const sortedData = [...data].sort((a, b) => {
      if (sortFn) {
        return newDirection === 'asc'
          ? sortFn(a, b, field)
          : sortFn(b, a, field);
      }

      const valueA = (a[field] as any)?.toString().toLowerCase() ?? '';
      const valueB = (b[field] as any)?.toString().toLowerCase() ?? '';

      return newDirection === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    });

    onChange(sortedData);
  };
  return (
    <div className="flex gap-2 items-center">
      {label}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`w-4 h-4 hover:bg-gray-100 dark:hover:bg-gray-700 ${direction ? 'text-primary' : ''}`}
          >
            <div className='flex gap-1'>
              <ChevronLeft className='rotate-180'/>
              <ChevronRight className='rotate-90'/>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-2 w-48">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className={`justify-start ${direction === 'asc' ? 'bg-accent' : ''}`}
              onClick={() => handleSort('asc')}
            >
              ASC
            </Button>
            <Button
              variant="ghost"
              className={`justify-start ${direction === 'desc' ? 'bg-accent' : ''}`}
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
