'use client';

import { Modal } from '@/core/components';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar } from '../../duplicated-components/avatar';
import { ITimerEmployeeLog, ITimerTaskLog } from '@/core/types/interfaces/activity/activity-report';

interface ActivityModalProps {
	employeeLog: ITimerEmployeeLog;
	isOpen: boolean;
	closeModal: () => void;
}

type TabType = 'tracked' | 'activity';

const TABS: readonly TabType[] = ['tracked', 'activity'];

const RING_CIRCUMFERENCE = 251.327;

const Circle = ({ className, dashArray }: { className: string; dashArray: number }) => (
	<circle
		cx="50"
		cy="50"
		r="40"
		fill="none"
		strokeWidth="20"
		className={className}
		strokeDasharray={`${dashArray} ${RING_CIRCUMFERENCE}`}
	/>
);

function formatSeconds(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const paddedMinutes = minutes.toString().padStart(2, '0');
	return `${hours}h ${paddedMinutes}min`;
}

function clampPercentage(value: number | undefined): number {
	if (!value || !Number.isFinite(value)) {
		return 0;
	}
	return Math.min(100, Math.max(0, value));
}

function shareOf(duration: number, total: number): number {
	if (total <= 0) {
		return 0;
	}
	return Math.round((duration / total) * 100);
}

function taskLabel(taskLog: ITimerTaskLog): string {
	const title = taskLog.task?.title;
	if (title) {
		return title;
	}
	return taskLog.description;
}

function byLongestDuration(first: ITimerTaskLog, second: ITimerTaskLog) {
	return second.duration - first.duration;
}

/**
 * What the daily report holds for one member: the total, the time per task and the activity level. The report
 * returns no tracked/manual or active/idle split, so the modal shows none.
 */
export const ActivityModal = ({ employeeLog, isOpen, closeModal }: ActivityModalProps) => {
	const t = useTranslations();
	const [activeTab, setActiveTab] = useState<TabType>('activity');

	const totalTime = employeeLog.sum || 0;
	const activityLevel = clampPercentage(employeeLog.activity);
	const activityArc = (activityLevel / 100) * RING_CIRCUMFERENCE;

	const sortedTasks = useMemo(() => {
		const tasks = employeeLog.tasks ?? [];
		return [...tasks].sort(byLongestDuration);
	}, [employeeLog.tasks]);
	const hasTasks = sortedTasks.length > 0;
	const isTrackedTab = activeTab === 'tracked';
	const isActivityTab = activeTab === 'activity';

	const tabLabels: Record<TabType, string> = {
		tracked: t('common.TASKS'),
		activity: t('common.ACTIVITY')
	};

	return (
		<Modal isOpen={isOpen} closeModal={closeModal} className="w-full max-w-lg">
			<div className="flex min-w-0 items-center gap-3 pr-8">
				<Avatar
					size={32}
					imageUrl={employeeLog.employee.user?.imageUrl}
					imageTitle={employeeLog.employee.fullName}
					className="relative shrink-0"
				/>
				<h3 className="truncate text-lg font-semibold text-foreground">{employeeLog.employee.fullName}</h3>
			</div>

			<SegmentedControl
				items={TABS.map((tab) => ({ value: tab, label: tabLabels[tab] }))}
				value={activeTab}
				onValueChange={setActiveTab}
				ariaLabel={t('common.ACTIVITY')}
				className="w-fit"
			/>

			<div className="flex items-baseline justify-between gap-4 hairline-b border-border pb-3">
				<span className="text-xs text-muted-foreground">{t('common.teamStats.TOTAL_TIME')}</span>
				<span className="text-2xl font-semibold tabular-nums text-foreground">{formatSeconds(totalTime)}</span>
			</div>

			{isTrackedTab && (
				<div className="w-full">
					{hasTasks && (
						<ul className="hairline-divide-y divide-border">
							{sortedTasks.map((taskLog, index) => {
								const share = shareOf(taskLog.duration, totalTime);
								return (
									<li
										key={`${taskLog.task?.id ?? 'task'}-${index}`}
										className="flex items-center gap-3 py-2.5"
									>
										<span className="min-w-0 flex-1 truncate text-sm text-foreground">
											{taskLabel(taskLog)}
										</span>
										<span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-foreground/10">
											<span
												className="block h-full rounded-full bg-primary"
												style={{ width: `${share}%` }}
											/>
										</span>
										<span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
											{share}%
										</span>
										<span className="w-20 shrink-0 text-right text-sm tabular-nums text-foreground">
											{formatSeconds(taskLog.duration)}
										</span>
									</li>
								);
							})}
						</ul>
					)}
					{!hasTasks && (
						<p className="py-6 text-center text-sm text-muted-foreground">{t('common.NO_TASKS')}</p>
					)}
				</div>
			)}

			{isActivityTab && (
				<div className="relative mx-auto size-48">
					<svg className="size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
						<Circle className="stroke-foreground/10" dashArray={RING_CIRCUMFERENCE} />
						<Circle className="stroke-primary" dashArray={activityArc} />
					</svg>
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
						<span className="text-2xl font-semibold tabular-nums text-foreground">
							{Math.round(activityLevel)}%
						</span>
						<span className="text-xs text-muted-foreground">{t('common.teamStats.ACTIVITY_LEVEL')}</span>
					</div>
				</div>
			)}
		</Modal>
	);
};
