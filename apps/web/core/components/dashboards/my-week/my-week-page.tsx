'use client';

import { type ReactNode, useMemo } from 'react';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { DashboardSection, DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import { Clock, Timer } from '@/core/components/icons';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { MY_WEEK_PATH } from '@/core/components/layouts/my-work-navigation';
import { type MyWeekPageState, useMyWeekPage } from '@/core/hooks/dashboards/my-week/use-my-week-page';
import { useIsTrackingEnabledFor } from '@/core/hooks/organizations/teams/use-active-team-member';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import { MY_WEEK_PERIODS, type MyWeekPeriodKey } from '@/core/lib/utils/dashboards/my-week';
import { isTrackingEnabledState } from '@/core/stores/timer/active-timer';
import { MyWeekBodySkeleton } from './my-week-page-skeleton';
import { MyWeekProjects } from './my-week-projects';
import { MyWeekRecentEntries } from './my-week-recent-entries';
import { MY_WEEK_COLUMNS } from './my-week-recipes';
import { MyWeekSummary } from './my-week-summary';

/** Where the timer and the task it runs on are picked: the home page. */
const TIMER_PATH = '/';

const PERIOD_LABEL_KEYS: Record<MyWeekPeriodKey, DottedLanguageObjectStringPaths> = {
	thisWeek: 'common.THIS_WEEK',
	lastWeek: 'common.LAST_WEEK',
	thisMonth: 'common.THIS_MONTH'
};

const EMPTY_TITLE_KEYS: Record<MyWeekPeriodKey, DottedLanguageObjectStringPaths> = {
	thisWeek: 'dashboard.myWeek.EMPTY_THIS_WEEK',
	lastWeek: 'dashboard.myWeek.EMPTY_LAST_WEEK',
	thisMonth: 'dashboard.myWeek.EMPTY_THIS_MONTH'
};

/** The three periods in one switch; on a narrow phone the longer languages scroll it sideways inside its row. */
function PeriodSwitch({
	value,
	onChange
}: Readonly<{ value: MyWeekPeriodKey; onChange: (key: MyWeekPeriodKey) => void }>) {
	const t = useTranslations();
	const items = useMemo<SegmentedControlItem<MyWeekPeriodKey>[]>(
		() => MY_WEEK_PERIODS.map((key) => ({ value: key, label: t(PERIOD_LABEL_KEYS[key]) })),
		[t]
	);
	return (
		<div className="-m-1 max-w-[calc(100%+0.5rem)] overflow-x-auto p-1 [scrollbar-width:none]">
			<SegmentedControl
				items={items}
				value={value}
				onValueChange={onChange}
				ariaLabel={t('dashboard.period.LABEL')}
			/>
		</div>
	);
}

/** A period without time says so once; one that holds today also points to the timer, where tracking is allowed. */
function EmptyPeriod({ shownKey, pointsToTimer }: Readonly<{ shownKey: MyWeekPeriodKey; pointsToTimer: boolean }>) {
	const t = useTranslations();
	let message: string | undefined;
	let action: ReactNode;
	if (pointsToTimer) {
		message = t('dashboard.myWeek.EMPTY_HINT');
		action = (
			<Button asChild variant="outline" size="default">
				<Link href={TIMER_PATH}>
					<Timer aria-hidden="true" />
					{t('dashboard.myWeek.OPEN_TIMER')}
				</Link>
			</Button>
		);
	}
	return (
		<DashboardSection>
			<BlockEmptyMessage
				title={t(EMPTY_TITLE_KEYS[shownKey])}
				message={message}
				action={action}
				className="py-16"
			/>
		</DashboardSection>
	);
}

function MyWeekBody({ page, canTrackTime }: Readonly<{ page: MyWeekPageState; canTrackTime: boolean }>) {
	const t = useTranslations();
	if (page.isMemberUnknown) {
		return (
			<DashboardSection>
				<BlockEmptyMessage
					title={t('dashboard.calendar.NO_MEMBER_TITLE')}
					message={t('dashboard.calendar.NO_MEMBER_MESSAGE')}
				/>
			</DashboardSection>
		);
	}
	if (page.showsError) {
		return <DashboardErrorNotice onRetry={page.refetch} />;
	}
	if (page.isLoading) {
		return <MyWeekBodySkeleton />;
	}
	if (page.isEmpty) {
		const holdsToday = page.figures.todaySeconds !== null;
		const pointsToTimer = holdsToday && canTrackTime;
		return <EmptyPeriod shownKey={page.shownKey} pointsToTimer={pointsToTimer} />;
	}
	return (
		<>
			<MyWeekSummary page={page} />
			<div className={MY_WEEK_COLUMNS}>
				<MyWeekProjects projects={page.projects} />
				<MyWeekRecentEntries
					entries={page.recentEntries}
					entryCount={page.entryCount}
					canTrackTime={canTrackTime}
				/>
			</div>
		</>
	);
}

/**
 * `/my-week`, under My work: where the signed-in person's week stands against their weekly limit. Only their own time
 * is read, so the page has no member to pick.
 */
export function MyWeekPage() {
	const t = useTranslations();
	const locale = useLocale();
	const showsTimer = useAtomValue(isTrackingEnabledState);
	const { data: user } = useUserQuery();
	const canTrackTime = useIsTrackingEnabledFor(user?.id);
	const page = useMyWeekPage();
	const title = t('dashboard.myWeek.TITLE');

	return (
		<PageLayout
			title={title}
			showTimer={showsTimer}
			className="min-h-0 flex-1"
			breadcrumb={
				<DashboardBreadcrumb
					icon={<Clock aria-hidden="true" />}
					paths={[{ title, href: `/${locale}${MY_WEEK_PATH}` }]}
				/>
			}
			mainHeaderSlot={
				<DashboardToolbar
					title={title}
					meta={formatPeriod(page.shownPeriod, locale)}
					isUpdating={page.isUpdating}
					updatingLabel={t('dashboard.myWeek.UPDATING')}
					controls={<PeriodSwitch value={page.periodKey} onChange={page.pickPeriod} />}
				/>
			}
		>
			<div className={DASHBOARD_STACK} aria-busy={page.isLoading}>
				<MyWeekBody page={page} canTrackTime={canTrackTime} />
			</div>
		</PageLayout>
	);
}
