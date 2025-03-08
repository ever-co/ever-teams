import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { Button } from '@components/ui/button';
import { Check } from 'lucide-react';

interface ViewOption {
  id: string;
  label: string;
  checked: boolean;
}

export default function ViewSelect() {
  const [viewOptions, setViewOptions] = React.useState<ViewOption[]>([
    { id: 'member', label: 'Member', checked: true },
    { id: 'project', label: 'Project', checked: true },
    { id: 'task', label: 'Task', checked: true },
    { id: 'trackedHours', label: 'Tracked Hours', checked: true },
    { id: 'earnings', label: 'Earnings', checked: true },
    { id: 'activityLevel', label: 'Activity Level', checked: true },
  ]);

  const handleCheckChange = (id: string) => {
    setViewOptions(prev =>
      prev.map(option =>
        option.id === id ? { ...option, checked: !option.checked } : option
      )
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
          >
            <path
              d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z"
              className="fill-current"
            />
            <path
              d="M4 13C4 12.4477 4.44772 12 5 12H19C19.5523 12 20 12.4477 20 13V15C20 15.5523 19.5523 16 19 16H5C4.44772 16 4 15.5523 4 15V13Z"
              className="fill-current"
            />
          </svg>
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-2 w-56">
        {viewOptions.map((option) => (
          <div
            key={option.id}
            className="flex items-center p-2 space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            onClick={() => handleCheckChange(option.id)}
          >
            <div className="flex items-center justify-center w-4 h-4">
              {option.checked && <Check className="w-4 h-4" />}
            </div>
            <span className="text-sm">{option.label}</span>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
