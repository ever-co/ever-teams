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
			<SelectTrigger className="h-8 w-[180px]">
				<div className="flex gap-2 items-center">
					<span className="text-muted-foreground">{t('timeActivity.GROUP_BY')}</span>
					<SelectValue placeholder={t('timeActivity.DATE')} className="text-foreground" />
				</div>
			</SelectTrigger>
			<SelectContent className="min-w-[200px]">
				<SelectItem value="daily" className="min-w-[160px] data-[state=checked]:text-primary-ink">
					{t('common.DAILY')}
				</SelectItem>
				<SelectItem value="weekly" className="min-w-[160px] data-[state=checked]:text-primary-ink">
					{t('common.WEEKLY')}
				</SelectItem>
				<SelectItem value="member" className="min-w-[160px] data-[state=checked]:text-primary-ink">
					{t('common.MEMBER')}
				</SelectItem>
				<SelectItem value="project" className="min-w-[160px] data-[state=checked]:text-primary-ink">
					{t('sidebar.PROJECTS')}
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
