import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select'
import React from 'react'
import { DateRangePickerTimeActivity, GroupBySelectTimeActivity, TimeActivityFilterPopover } from '.'
import ViewSelect, { ViewOption } from './ViewSelect'

export interface TimeActivityHeaderProps {
  viewOptions?: ViewOption[];
  onViewOptionsChange?: (options: ViewOption[]) => void;
}

const defaultViewOptions: ViewOption[] = [
  { id: 'member', label: 'Member', checked: true },
  { id: 'project', label: 'Project', checked: true },
  { id: 'task', label: 'Task', checked: true },
  { id: 'trackedHours', label: 'Tracked Hours', checked: true },
  { id: 'earnings', label: 'Earnings', checked: true },
  { id: 'activityLevel', label: 'Activity Level', checked: true },
];

function TimeActivityHeader({ viewOptions: externalViewOptions, onViewOptionsChange }: TimeActivityHeaderProps) {
  const [internalViewOptions, setInternalViewOptions] = React.useState<ViewOption[]>(
    defaultViewOptions
  );

  const handleViewOptionsChange = React.useCallback((newOptions: ViewOption[]) => {
    if (onViewOptionsChange) {
      onViewOptionsChange(newOptions);
    } else {
      setInternalViewOptions(newOptions);
    }
  }, [onViewOptionsChange]);

  const currentViewOptions = externalViewOptions || internalViewOptions;
  return (
    <div className="flex justify-between items-center w-full">
    <h1 className="text-2xl font-semibold">Time and Activity</h1>
    <div className="flex gap-4 items-center">
        <GroupBySelectTimeActivity/>
        <TimeActivityFilterPopover/>
        <ViewSelect
          viewOptions={currentViewOptions}
          onChange={handleViewOptionsChange}
        />
        <DateRangePickerTimeActivity/>
        <div className="flex gap-2 items-center">
            <Select defaultValue="export">
                <SelectTrigger className="w-[100px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light">
                    <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent className="dark:bg-dark--theme-light">
                    <SelectItem className=' data-[state=checked]:text-blue-600' value="export">Export</SelectItem>
                    <SelectItem className=' data-[state=checked]:text-blue-600' value="pdf">PDF</SelectItem>
                    <SelectItem className=' data-[state=checked]:text-blue-600' value="xlsx">XLSX</SelectItem>
                </SelectContent>
            </Select>
        </div>

    </div>
</div>
  )
}

export type { ViewOption };
export { defaultViewOptions };
export default TimeActivityHeader;
