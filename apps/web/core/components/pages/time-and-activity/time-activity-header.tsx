import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import React from 'react';
import { DateRange } from 'react-day-picker';
import { GroupByType } from '@/core/hooks/activities/use-report-activity';
import { GroupBySelectTimeActivity } from '@/core/components/pages/time-and-activity/group-by-select-time-activity';
import { TimeActivityFilterPopover } from '../../activities/time-activity-filter-popover';
import { DateRangePickerTimeActivity } from './date-range-picker-time-activity';
import ViewSelect, { ViewOption } from '../../common/view-select';
import { TOrganizationProject, TOrganizationTeam, TEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TranslationHooks, useTranslations } from 'next-intl';

interface FilterState {
	teams: TOrganizationTeam[];
	members: TEmployee[];
	projects: TOrganizationProject[];
	tasks: TTask[];
}

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
	onFiltersApply?: (filters: FilterState) => void;
}

const getDefaultViewOptions = (t: TranslationHooks): ViewOption[] => [
	{ id: 'member', label: t('common.MEMBER'), checked: true },
	{ id: 'project', label: t('sidebar.PROJECTS'), checked: true },
	{ id: 'task', label: t('common.TASK'), checked: true },
	{ id: 'trackedHours', label: t('timeActivity.TRACKED_HOURS'), checked: true },
	{ id: 'earnings', label: t('timeActivity.EARNINGS'), checked: true },
	{ id: 'activityLevel', label: t('timeActivity.ACTIVITY_LEVEL'), checked: true }
];

function TimeActivityHeader({
	viewOptions: externalViewOptions,
	onViewOptionsChange,
	...props
}: TimeActivityHeaderProps) {
	const t = useTranslations();
	const [internalViewOptions, setInternalViewOptions] = React.useState<ViewOption[]>(getDefaultViewOptions(t));

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
		<div className="flex justify-between items-center w-full dark:bg-dar">
			<h1 className="text-2xl font-semibold">{t('timeActivity.TIME_AND_ACTIVITY')}</h1>
			<div className="flex gap-4 items-center">
				<GroupBySelectTimeActivity onGroupByChange={props.onGroupByChange} groupByType={props.groupByType} />
				<TimeActivityFilterPopover {...props} />
				<ViewSelect viewOptions={currentViewOptions} onChange={handleViewOptionsChange} />
				<DateRangePickerTimeActivity onDateRangeChange={handleDateRangeChange} />
				<div className="flex gap-2 items-center">
					<Select defaultValue="export">
						<SelectTrigger className="w-[100px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light">
							<SelectValue placeholder={t('common.EXPORT')} />
						</SelectTrigger>
						<SelectContent className="dark:bg-dark--theme-light">
							<SelectItem className=" data-[state=checked]:text-blue-600" value="export">
								{t('common.EXPORT')}
							</SelectItem>
							<SelectItem className=" data-[state=checked]:text-blue-600" value="pdf">
								{t('common.PDF')}
							</SelectItem>
							<SelectItem className=" data-[state=checked]:text-blue-600" value="xlsx">
								{t('common.XLSX')}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}

export type { ViewOption };
export { getDefaultViewOptions, TimeActivityHeader };
