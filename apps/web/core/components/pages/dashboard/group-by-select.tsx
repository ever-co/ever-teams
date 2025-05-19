'use client';

import { GroupByType } from '@/core/hooks/activities/use-report-activity';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';

interface GroupBySelectProps {
	onGroupByChange?: (value: GroupByType) => void;
	groupByType?: GroupByType;
}

export function GroupBySelect({ onGroupByChange, groupByType }: GroupBySelectProps) {
	return (
		<Select defaultValue={groupByType} onValueChange={onGroupByChange}>
			<SelectTrigger className="w-[180px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light">
				<div className="flex gap-2 items-center">
					<span className="text-gray-500">Group by</span>
					<SelectValue placeholder="Date" className="text-blue-600 dark:text-blue-500" />
				</div>
			</SelectTrigger>
			<SelectContent className="dark:bg-dark--theme-light min-w-[180px]">
				<SelectItem value="date" className="min-w-[160px] data-[state=checked]:text-blue-600">
					Date
				</SelectItem>
				<SelectItem value="project" className="min-w-[160px] data-[state=checked]:text-blue-600">
					Project
				</SelectItem>
				<SelectItem value="employee" className="min-w-[160px] data-[state=checked]:text-blue-600">
					Person
				</SelectItem>
				<SelectItem value="application" className="min-w-[160px] data-[state=checked]:text-blue-600">
					Application
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
