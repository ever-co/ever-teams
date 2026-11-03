'use client';

import { useTranslations } from 'next-intl';
import { useTimeDailyActivity } from '@/core/hooks/activities/use-time-daily-activity';
import { failureOfActivityRead } from '@/core/components/activities/activity-blocks';
import { TDailyActivity } from '@/core/types/schemas';
import { ActivityShareGroups } from '../activity-share-groups';

const NO_ACTIVITIES: TDailyActivity[] = [];

export function VisitedSitesTab() {
	const t = useTranslations();
	const dailyActivity = useTimeDailyActivity('SITE');
	const failure = failureOfActivityRead(dailyActivity);
	const visitedSites = dailyActivity.visitedSites ?? NO_ACTIVITIES;

	return (
		<ActivityShareGroups
			activities={visitedSites}
			type="SITE"
			loading={dailyActivity.loading}
			failure={failure}
			emptyLabel={t('timer.NO_VISITED_SITE_MESSAGE')}
			errorTitle={t('profile.activity.SITES_ERROR')}
		/>
	);
}
