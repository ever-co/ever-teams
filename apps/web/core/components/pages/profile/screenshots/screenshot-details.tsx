'use client';

import React, { type ReactNode, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useTaskQueries } from '@/core/hooks';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { APP_DIALOG_BODY, AppDialog, AppDialogHeader } from '@/core/components/common/app-dialog';
import { ActivityFigure } from '@/core/components/dashboards/kit/meters';
import { webAddressOf } from '@/core/components/activities/activity-links';
import { cn } from '@/core/lib/helpers';
import { TOrganizationProject, TTimeSlot } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { QUIET_SHOT_FRAME, SHOT_FRAME, SlotThumbnail } from './screenshot-item';
import { formatDateValue, type SlotScreenshot, screenshotsOf, slotRangeTextOf } from './screenshot-slots';

interface SlotTimeLog {
	projectId?: string;
	taskId?: string;
	source?: string;
	version?: string;
}

const NO_VALUE = '–';

const SECTION_LABEL = 'text-xs font-medium text-muted-foreground';

const PROPERTY_ROW = 'grid min-h-8 grid-cols-[6.75rem_minmax(0,1fr)] items-center gap-x-3 py-1';

const VALUE_CHIP =
	'inline-flex h-5 max-w-full items-center truncate rounded-md px-1.5 text-xs font-medium text-foreground hairline-ring ring-border';

function firstTimeLogOf(slot: TTimeSlot): SlotTimeLog | undefined {
	const timeLogs: SlotTimeLog[] = slot.timeLogs ?? [];
	return timeLogs[0];
}

function useSlotProject(projectId: string | undefined) {
	const { organizationProjects } = useOrganizationProjectsQuery();
	return useMemo(() => {
		if (!projectId) {
			return null;
		}
		const project = organizationProjects.find((candidate) => candidate.id === projectId);
		return project ?? null;
	}, [organizationProjects, projectId]);
}

/** The slot's task, read only for the open detail; the result is kept under its id so a stale read never shows. */
function useSlotTask(taskId: string | undefined) {
	const { getTaskById } = useTaskQueries();
	const [loadedTask, setLoadedTask] = useState<TTask | null>(null);

	useEffect(() => {
		if (!taskId) {
			return;
		}
		let isCurrent = true;
		getTaskById(taskId, false).then((task) => {
			if (!isCurrent) {
				return;
			}
			if (task) {
				setLoadedTask(task as TTask);
			}
		});
		return () => {
			isCurrent = false;
		};
	}, [getTaskById, taskId]);

	const isLoadedTask = loadedTask?.id === taskId;
	if (!isLoadedTask) {
		return null;
	}
	return loadedTask;
}

function PropertyRow({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
	return (
		<div className={PROPERTY_ROW}>
			<dt className="text-[13px] text-muted-foreground">{label}</dt>
			<dd className="min-w-0 text-[13px] text-foreground">{children}</dd>
		</div>
	);
}

function MutedValue({ children }: Readonly<{ children: ReactNode }>) {
	return <span className="text-muted-foreground">{children}</span>;
}

function SourceValue({ timeLog }: Readonly<{ timeLog: SlotTimeLog | undefined }>) {
	const source = timeLog?.source;
	const version = timeLog?.version;
	const hasSource = Boolean(source);
	const hasVersion = Boolean(version);
	const hasNone = !hasSource && !hasVersion;
	if (hasNone) {
		return <MutedValue>{NO_VALUE}</MutedValue>;
	}
	return (
		<span className="flex flex-wrap gap-1">
			{hasSource && <span className={VALUE_CHIP}>{source}</span>}
			{hasVersion && <span className={cn(VALUE_CHIP, 'font-normal text-muted-foreground')}>{version}</span>}
		</span>
	);
}

function ProjectTile({ project }: Readonly<{ project: TOrganizationProject }>) {
	const name = project.name ?? '';
	const initial = name.charAt(0);
	if (project.imageUrl) {
		return (
			<span className="relative size-6 shrink-0 overflow-hidden rounded-md">
				<Image src={project.imageUrl} alt="" width={48} height={48} className="size-full object-cover" />
			</span>
		);
	}
	return (
		<span
			aria-hidden="true"
			className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-medium uppercase text-primary-ink"
		>
			{initial}
		</span>
	);
}

function ProjectValue({ project }: Readonly<{ project: TOrganizationProject | null }>) {
	const t = useTranslations();
	if (!project) {
		return <MutedValue>{t('common.NO_PROJECT')}</MutedValue>;
	}
	const membersCount = project.membersCount ?? NO_VALUE;
	return (
		<span className="flex min-w-0 items-center gap-2">
			<ProjectTile project={project} />
			<span className="flex min-w-0 flex-col">
				<span className="truncate font-medium">{project.name}</span>
				<span className="text-xs text-muted-foreground">
					{t('common.MEMBERS_COUNT')}: {membersCount}
				</span>
			</span>
		</span>
	);
}

function ShotCard({ shot, format }: Readonly<{ shot: SlotScreenshot; format: Intl.DateTimeFormat }>) {
	const t = useTranslations();
	const timeText = formatDateValue(format, shot.recordedAt);
	const alt = t('profile.activity.SCREENSHOT_ALT', { time: timeText });
	const thumbUrl = shot.thumbUrl ?? '';
	const viewSource = shot.fullUrl || thumbUrl;
	const viewUrl = webAddressOf(viewSource);
	const thumbnail = <SlotThumbnail imageUrl={thumbUrl} alt={alt} />;
	return (
		<div className="flex flex-col gap-1.5">
			{viewUrl && (
				<a
					href={viewUrl}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={t('profile.activity.VIEW_FULL')}
					className="group/thumb block rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					{thumbnail}
				</a>
			)}
			{!viewUrl && thumbnail}
			<span className="text-xs tabular-nums text-muted-foreground">{timeText}</span>
		</div>
	);
}

function ScreenshotStrip({ slot, format }: Readonly<{ slot: TTimeSlot; format: Intl.DateTimeFormat }>) {
	const t = useTranslations();
	const shots = screenshotsOf(slot);
	const count = shots.length;
	return (
		<section className="flex flex-col gap-2">
			<h3 className={cn(SECTION_LABEL, 'flex items-center gap-2')}>
				<span>{t('common.SCREENSHOTS')}</span>
				<span className="font-normal tabular-nums">{t('profile.activity.SCREENSHOT_COUNT', { count })}</span>
			</h3>
			{count === 0 && (
				<span className={cn(SHOT_FRAME, QUIET_SHOT_FRAME, 'max-w-48')}>
					{t('profile.activity.NO_SCREENSHOT')}
				</span>
			)}
			{count > 0 && (
				<ol className="-mx-5 flex gap-3 overflow-x-auto px-5 pt-1 pb-2">
					{shots.map((shot, index) => (
						<li key={shot.id ?? index} className="w-44 shrink-0">
							<ShotCard shot={shot} format={format} />
						</li>
					))}
				</ol>
			)}
		</section>
	);
}

/** Mounted only while the dialog is open, so the projects read starts when a slot's detail opens. */
function ScreenshotDetailsContent({ slot, onClose }: Readonly<{ slot: TTimeSlot; onClose: () => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	const formats = useMemo(
		() => ({
			day: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
			time: new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })
		}),
		[locale]
	);
	const timeLog = firstTimeLogOf(slot);
	const project = useSlotProject(timeLog?.projectId);
	const task = useSlotTask(timeLog?.taskId);
	const dayText = formatDateValue(formats.day, slot.startedAt);
	const rangeText = slotRangeTextOf(formats.time, slot.startedAt, slot.stoppedAt);
	const percent = slot.percentage ?? 0;
	const client = project?.owner;

	return (
		<>
			<AppDialogHeader context={dayText} title={rangeText} onClose={onClose} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-5 pb-5')}>
				<dl className="flex flex-col">
					<PropertyRow label={t('timer.TIME_ACTIVITY')}>
						<ActivityFigure percent={percent} className="justify-start" />
					</PropertyRow>
				</dl>
				<ScreenshotStrip slot={slot} format={formats.time} />
				<section className="flex flex-col gap-1">
					<h3 className={SECTION_LABEL}>{t('common.TIME_LOG')}</h3>
					<dl className="flex flex-col">
						<PropertyRow label={t('common.SOURCE')}>
							<SourceValue timeLog={timeLog} />
						</PropertyRow>
						<PropertyRow label={t('common.CLIENT')}>
							{client && <span className="truncate">{client}</span>}
							{!client && <MutedValue>{t('common.NO_CLIENT')}</MutedValue>}
						</PropertyRow>
						<PropertyRow label={t('pages.taskDetails.PROJECT')}>
							<ProjectValue project={project} />
						</PropertyRow>
						<PropertyRow label={t('common.TO_DO')}>
							{task && <span className="line-clamp-2">{task.title}</span>}
							{!task && <MutedValue>{NO_VALUE}</MutedValue>}
						</PropertyRow>
					</dl>
				</section>
			</div>
		</>
	);
}

/** A slot's detail: its day and range, the activity, its screenshots with their time, and its time log. */
const ScreenshotDetailsModal = ({
	open,
	closeModal,
	slot
}: {
	open: boolean;
	closeModal: () => void;
	slot?: TTimeSlot | null;
}) => {
	return (
		<AppDialog open={open} onClose={closeModal} width="lg">
			{slot && <ScreenshotDetailsContent slot={slot} onClose={closeModal} />}
		</AppDialog>
	);
};

export default React.memo(ScreenshotDetailsModal);
