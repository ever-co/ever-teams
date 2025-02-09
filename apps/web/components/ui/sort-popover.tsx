import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SortPopoverProps {
  onSort: (direction: 'asc' | 'desc') => void;
  label: string;
}

export function SortPopover({ onSort, label }: SortPopoverProps) {
  return (
    <div className="flex gap-2 items-center">
      {label}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="w-4 h-4 hover:bg-gray-100 dark:hover:bg-gray-700">
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
              className="justify-start"
              onClick={() => onSort('asc')}
            >
              ASC
            </Button>
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => onSort('desc')}
            >
              DESC
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
