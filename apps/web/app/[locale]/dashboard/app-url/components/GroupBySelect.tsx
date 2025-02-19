'use client';

import { GroupByType } from '@/app/hooks/features/useReportActivity';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GroupBySelectProps {
    onGroupByChange?: (value: GroupByType) => void;
}

export function GroupBySelect({ onGroupByChange }: GroupBySelectProps) {
    return (
        <Select defaultValue="date" onValueChange={onGroupByChange}>
            <SelectTrigger className="w-[180px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light">
                <div className="flex gap-2 items-center">
                    <span className="text-gray-500">Group by</span>
                    <SelectValue placeholder="Date"  className='text-[#2563EB]'/>
                </div>
            </SelectTrigger>
            <SelectContent className="dark:bg-dark--theme-light">
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="person">Person</SelectItem>
                <SelectItem value="application">Application</SelectItem>
            </SelectContent>
        </Select>
    );
}
