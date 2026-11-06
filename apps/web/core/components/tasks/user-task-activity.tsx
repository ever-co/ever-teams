import React from 'react';
import { clsxm } from '@/core/lib/utils';
import { Tab } from '@headlessui/react';
import { ActivityFilters } from '@/core/constants/config/constants';
import { ChevronDown, ChevronUp } from '@/core/components/icons';
import ScreenshotItem from '../pages/profile/screenshots/screenshot-item';
import { Tooltip } from '../duplicated-components/tooltip';
import { TActivity } from '@/core/types/schemas';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';

const sourceChipClassName = 'mb-1 rounded-md bg-info/10 px-1.5 py-0.5 text-xs font-medium text-info-foreground';

// Only the page data of a visited site carries a url: metaData can also be a string (SQLite) or an array (agent rows)
function readVisitedUrl(metaData: TActivity['metaData']): string | undefined {
	if (typeof metaData !== 'object' || metaData === null) {
		return undefined;
	}
	if (Array.isArray(metaData)) {
		return undefined;
	}
	return metaData.url;
}

export const UserTaskActivity = ({ timesheet }: { timesheet: TActivity }) => {
	const [hidden, setHidden] = React.useState(true);
	const t = useTranslations();
	// Each activity record is one app or one visited site (Gauzy ActivityType APP | URL), with its own duration
	const activityType = timesheet.type?.toUpperCase();
	const visitedUrl = readVisitedUrl(timesheet.metaData);
	const isAppActivity = activityType === 'APP';
	const isUrlActivity = activityType === 'URL';
	return (
		<div className="flex flex-col py-1">
			<div className="flex min-h-10 items-center justify-between gap-5">
				<div className="flex min-w-0 items-center gap-2">
					<h4 className="truncate text-sm font-medium">{timesheet.employee?.fullName}</h4>
					<span className="shrink-0 text-xs tabular-nums text-muted-foreground">{timesheet.duration}</span>
				</div>

				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="shrink-0 text-muted-foreground"
					onClick={() => setHidden((e) => !e)}
				>
					{hidden && <ChevronDown className="size-4" />}
					{!hidden && <ChevronUp className="size-4" />}
				</Button>
			</div>
			<div
				className={clsxm(
					'mb-2 flex max-h-96 flex-col gap-3 overflow-y-auto rounded-lg bg-foreground/[0.025] px-4',
					hidden && 'hidden'
				)}
			>
				<Tab.Group>
					<Tab.List className="flex w-full gap-6 hairline-b border-border">
						{Object.values(ActivityFilters)
							.filter((filter) => filter !== 'Tasks')
							.map((filter: string) => (
								<Tab
									key={filter}
									className={({ selected }) =>
										clsxm(
											'-mb-px border-b-2 pt-2 pb-2.5 text-sm font-medium leading-5 transition-colors',
											'rounded-t-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
											selected && 'border-primary font-semibold text-primary-ink',
											!selected &&
												'border-transparent text-foreground/55 hover:text-foreground/80'
										)
									}
								>
									{filter}
								</Tab>
							))}
					</Tab.List>
					<Tab.Panels>
						<Tab.Panel className="w-full py-4">
							<div className="my-2 flex w-full overflow-x-auto">
								{timesheet.timeSlot?.screenshots?.map((screenshot, i) => (
									<div key={i} className="w-1/3 min-w-[20rem] p-2">
										<Tooltip
											label={screenshot.description || ''}
											placement="left-start"
											type="VERTICAL"
											labelContainerClassName="w-full"
										>
											<ScreenshotItem
												idSlot={timesheet.timeSlot?.id ?? ''}
												ownerEmployeeId={timesheet.employeeId ?? undefined}
												endTime={timesheet.timeSlot?.stoppedAt ?? ''}
												startTime={screenshot.recordedAt || ''}
												imageUrl={screenshot.thumbUrl || ''}
												percent={timesheet.timeSlot?.percentage ?? 0}
												showProgress={false}
												onShow={() => null}
											/>
										</Tooltip>
										<div className="rounded-b-lg bg-foreground/[0.03] p-2">
											<h5 className="text-xs font-medium text-muted-foreground">
												{t('common.SOURCE')}
											</h5>
											<div className="my-1 flex flex-wrap gap-1">
												<span className={sourceChipClassName}>{timesheet.source}</span>
												{Array.isArray(screenshot.apps) &&
													screenshot.apps.map((app: string) => (
														<span key={app} className={sourceChipClassName}>
															{app}
														</span>
													))}
											</div>
										</div>
									</div>
								))}
							</div>
						</Tab.Panel>
						<Tab.Panel className="w-full py-4">
							{isAppActivity && (
								<div className="flex justify-between gap-4">
									<span className="font-medium">{timesheet.title}</span>
									<span className="tabular-nums text-muted-foreground">{timesheet.duration}</span>
								</div>
							)}
							{!isAppActivity && (
								<p className="text-sm text-muted-foreground">{t('common.NO_ACTIVITY_DATA')}</p>
							)}
						</Tab.Panel>
						<Tab.Panel className="w-full py-4">
							{isUrlActivity && (
								<div className="flex justify-between gap-4">
									<span className="font-medium break-all">{visitedUrl || timesheet.title}</span>
									<span className="tabular-nums text-muted-foreground">{timesheet.duration}</span>
								</div>
							)}
							{!isUrlActivity && (
								<p className="text-sm text-muted-foreground">{t('common.NO_ACTIVITY_DATA')}</p>
							)}
						</Tab.Panel>
					</Tab.Panels>
				</Tab.Group>
			</div>
		</div>
	);
};
