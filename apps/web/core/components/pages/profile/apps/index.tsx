'use client';

import { useTranslations } from 'next-intl';
import { useTimeDailyActivity } from '@/core/hooks/activities/use-time-daily-activity';
import { failureOfActivityRead } from '@/core/components/activities/activity-blocks';
import { TDailyActivity } from '@/core/types/schemas';
import { ActivityShareGroups } from '../activity-share-groups';

const NO_ACTIVITIES: TDailyActivity[] = [];

export function AppsTab() {
	const t = useTranslations();
	const dailyActivity = useTimeDailyActivity('APP');
	const failure = failureOfActivityRead(dailyActivity);
	const visitedApps = dailyActivity.visitedApps ?? NO_ACTIVITIES;

	return (
		<ActivityShareGroups
			activities={visitedApps}
			type="APP"
			loading={dailyActivity.loading}
			failure={failure}
			emptyLabel={t('timer.THERE_IS_NO_APPS_VISITED')}
			errorTitle={t('profile.activity.APPS_ERROR')}
		/>
	);
}
