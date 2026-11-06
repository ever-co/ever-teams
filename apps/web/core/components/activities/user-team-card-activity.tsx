import { Transition } from '@headlessui/react';
import React, { useState } from 'react';
import { useTimeSlots } from '@/core/hooks/activities/use-time-slots';
import { useTranslations } from 'next-intl';
import { ActivityFilters } from '@/core/constants/config/constants';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { ACTIVITY_TAB_LABEL_KEYS } from './activity-tab-labels';
import {
	LazyOptimizedTasksTab,
	LazyOptimizedAppsTab,
	LazyOptimizedVisitedSitesTab,
	LazyOptimizedScreenshotsTab
} from '@/core/components/optimized-components';
import { TodayWorkedTasks } from './today-worked-tasks';

const UserTeamActivity = ({
	showActivity,
	member,
	canSeeActivity
}: {
	showActivity: boolean;
	member?: any;
	canSeeActivity: boolean;
}) => {
	const { timeSlots } = useTimeSlots(true);
	const t = useTranslations();
	const [activityTab, setActivityTab] = useState<ActivityFilters>(ActivityFilters.TASKS);
	const activityTabItems = Object.values(ActivityFilters).map((filter) => ({
		value: filter,
		label: t(ACTIVITY_TAB_LABEL_KEYS[filter])
	}));
	const canShowWorkedTasks = canSeeActivity && Boolean(member?.id);

	const hasTimeSlots = timeSlots.length > 0;
	const activitySum = timeSlots.reduce((acc, el) => acc + (el.percentage || 0), 0);
	let activityPercent: number | null = null;
	if (hasTimeSlots) {
		activityPercent = activitySum / timeSlots.length;
	}

	return (
		<Transition
			as="div"
			show={!!showActivity}
			enter="transition-opacity duration-75"
			enterFrom="opacity-0"
			enterTo="opacity-100"
			leave="transition-opacity duration-150"
			leaveFrom="opacity-100"
			leaveTo="opacity-0"
			className="w-full"
		>
			<div className="flex w-full flex-col gap-4 pb-2 pt-4">
				<h3 className="text-[13px] font-semibold text-foreground">{t('common.ACTIVITY_FOR_TODAY')}</h3>
				<TodayWorkedTasks
					memberId={member?.id}
					activityPercent={activityPercent}
					showsTasks={canShowWorkedTasks}
				/>
				<div className="-mx-2 flex min-w-0 flex-col gap-3 overflow-x-clip px-2 pb-2">
					<SegmentedControl
						items={activityTabItems}
						value={activityTab}
						onValueChange={setActivityTab}
						ariaLabel={t('common.ACTIVITY')}
						className="self-start"
					/>
					{activityTab === ActivityFilters.TASKS && (
						<LazyOptimizedTasksTab member={member} canSeeActivity={canSeeActivity} />
					)}
					{activityTab === ActivityFilters.SCREENSHOOTS && <LazyOptimizedScreenshotsTab />}
					{activityTab === ActivityFilters.APPS && <LazyOptimizedAppsTab />}
					{activityTab === ActivityFilters.VISITED_SITES && <LazyOptimizedVisitedSitesTab />}
				</div>
			</div>
		</Transition>
	);
};

export default React.memo(UserTeamActivity);
