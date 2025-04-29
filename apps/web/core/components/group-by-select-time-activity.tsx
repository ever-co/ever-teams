'use client';

import { GroupByType } from '@/app/hooks/features/useReportActivity';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/ui/select';

interface GroupBySelectProps {
	onGroupByChange?: (value: GroupByType) => void;
	groupByType?: GroupByType;
}

export function GroupBySelectTimeActivity({ onGroupByChange, groupByType }: GroupBySelectProps) {
	return (
		<Select defaultValue={groupByType} onValueChange={onGroupByChange}>
			<SelectTrigger className="w-[180px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light">
				<div className="flex gap-2 items-center">
					<span className="text-gray-500">Group by</span>
					<SelectValue placeholder="Date" className="text-blue-600 dark:text-blue-500" />
				</div>
			</SelectTrigger>
			<SelectContent className="dark:bg-dark--theme-light min-w-[200px]">
				<SelectItem value="daily" className="min-w-[160px] data-[state=checked]:text-blue-600">
					Daily
				</SelectItem>
				<SelectItem value="weekly" className="min-w-[160px] data-[state=checked]:text-blue-600">
					Weekly
				</SelectItem>
				<SelectItem value="member" className="min-w-[160px] data-[state=checked]:text-blue-600">
					Member
				</SelectItem>
				<SelectItem value="project" className="min-w-[160px] data-[state=checked]:text-blue-600">
					Project
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
