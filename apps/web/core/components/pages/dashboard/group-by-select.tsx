'use client';

import { GroupByType } from '@/core/hooks/activities/use-report-activity';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { useTranslations } from 'next-intl';

interface GroupBySelectProps {
	onGroupByChange?: (value: GroupByType) => void;
	groupByType?: GroupByType;
}

export function GroupBySelect({ onGroupByChange, groupByType }: GroupBySelectProps) {
	const t = useTranslations();

	return (
		<Select defaultValue={groupByType} onValueChange={onGroupByChange}>
			<SelectTrigger className="h-8 w-[180px]">
				<div className="flex gap-2 items-center">
					<span className="text-muted-foreground">{t('common.GROUP_BY')}</span>
					<SelectValue placeholder={t('common.DATE')} className="text-foreground" />
				</div>
			</SelectTrigger>
			<SelectContent className="min-w-[180px]">
				<SelectItem value="date" className="min-w-[160px] data-[state=checked]:text-primary-ink">
					{t('common.DATE')}
				</SelectItem>
				<SelectItem value="project" className="min-w-[160px] data-[state=checked]:text-primary-ink">
					{t('pages.projects.projectTitle.SINGULAR')}
				</SelectItem>
				<SelectItem value="employee" className="min-w-[160px] data-[state=checked]:text-primary-ink">
					{t('common.PERSON')}
				</SelectItem>
				<SelectItem value="application" className="min-w-[160px] data-[state=checked]:text-primary-ink">
					{t('common.APPLICATION')}
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
