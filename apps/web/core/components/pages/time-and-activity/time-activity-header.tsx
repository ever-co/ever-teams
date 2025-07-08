import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import React from 'react';
import { DateRange } from 'react-day-picker';
import { GroupByType } from '@/core/hooks/activities/use-report-activity';
import { GroupBySelectTimeActivity } from '@/core/components/pages/time-and-activity/group-by-select-time-activity';
import { TimeActivityFilterPopover } from '../../activities/time-activity-filter-popover';
import { DateRangePickerTimeActivity } from './date-range-picker-time-activity';
import ViewSelect, { ViewOption } from '../../common/view-select';
import { TOrganizationProject, TOrganizationTeam } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

export interface TimeActivityHeaderProps {
	viewOptions?: ViewOption[];
	onViewOptionsChange?: (options: ViewOption[]) => void;
	userManagedTeams?: TOrganizationTeam[];
	projects?: TOrganizationProject[];
	tasks?: TTask[];
	activeTeam?: TOrganizationTeam | null;
	onUpdateDateRange: (startDate: Date, endDate: Date) => void;
	onGroupByChange?: (value: GroupByType) => void;
	groupByType?: GroupByType;
}

const defaultViewOptions: ViewOption[] = [
	{ id: 'member', label: 'Member', checked: true },
	{ id: 'project', label: 'Project', checked: true },
	{ id: 'task', label: 'Task', checked: true },
	{ id: 'trackedHours', label: 'Tracked Hours', checked: true },
	{ id: 'earnings', label: 'Earnings', checked: true },
	{ id: 'activityLevel', label: 'Activity Level', checked: true }
];

function TimeActivityHeader({
	viewOptions: externalViewOptions,
	onViewOptionsChange,
	...props
}: TimeActivityHeaderProps) {
	const [internalViewOptions, setInternalViewOptions] = React.useState<ViewOption[]>(defaultViewOptions);

	const handleViewOptionsChange = React.useCallback(
		(newOptions: ViewOption[]) => {
			if (onViewOptionsChange) {
				onViewOptionsChange(newOptions);
			} else {
				setInternalViewOptions(newOptions);
			}
		},
		[onViewOptionsChange]
	);

	const handleDateRangeChange = (range: DateRange | undefined) => {
		if (range?.from && range?.to) {
			props.onUpdateDateRange(range.from, range.to);
		}
	};
	const currentViewOptions = externalViewOptions || internalViewOptions;

	return (
		<div className="flex items-center justify-between w-full dark:bg-dar">
			<h1 className="text-2xl font-semibold">Time and Activity</h1>
			<div className="flex items-center gap-4">
				<GroupBySelectTimeActivity onGroupByChange={props.onGroupByChange} groupByType={props.groupByType} />
				<TimeActivityFilterPopover {...props} />
				<ViewSelect viewOptions={currentViewOptions} onChange={handleViewOptionsChange} />
				<DateRangePickerTimeActivity onDateRangeChange={handleDateRangeChange} />
				<div className="flex items-center gap-2">
					<Select defaultValue="export">
						<SelectTrigger className="w-[100px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light">
							<SelectValue placeholder="Export" />
						</SelectTrigger>
						<SelectContent className="dark:bg-dark--theme-light">
							<SelectItem className=" data-[state=checked]:text-blue-600" value="export">
								Export
							</SelectItem>
							<SelectItem className=" data-[state=checked]:text-blue-600" value="pdf">
								PDF
							</SelectItem>
							<SelectItem className=" data-[state=checked]:text-blue-600" value="xlsx">
								XLSX
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}

export type { ViewOption };
export { defaultViewOptions, TimeActivityHeader };
