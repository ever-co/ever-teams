'use client';

import { GroupByType } from '@/core/hooks/activities/use-report-activity';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { useTranslations } from 'next-intl';

interface GroupBySelectProps {
	onGroupByChange?: (value: GroupByType) => void;
	groupByType?: GroupByType;
}

export function GroupBySelectTimeActivity({ onGroupByChange, groupByType }: GroupBySelectProps) {
	const t = useTranslations();

	return (
		<Select defaultValue={groupByType} onValueChange={onGroupByChange}>
			<SelectTrigger className="w-[180px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light">
				<div className="flex gap-2 items-center">
					<span className="text-gray-500">{t('timeActivity.GROUP_BY')}</span>
					<SelectValue placeholder={t('timeActivity.DATE')} className="text-blue-600 dark:text-blue-500" />
				</div>
			</SelectTrigger>
			<SelectContent className="dark:bg-dark--theme-light min-w-[200px]">
				<SelectItem value="daily" className="min-w-[160px] data-[state=checked]:text-blue-600">
					{t('common.DAILY')}
				</SelectItem>
				<SelectItem value="weekly" className="min-w-[160px] data-[state=checked]:text-blue-600">
					{t('common.WEEKLY')}
				</SelectItem>
				<SelectItem value="member" className="min-w-[160px] data-[state=checked]:text-blue-600">
					{t('common.MEMBER')}
				</SelectItem>
				<SelectItem value="project" className="min-w-[160px] data-[state=checked]:text-blue-600">
					{t('sidebar.PROJECTS')}
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
