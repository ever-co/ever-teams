'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
	floatingSheetSurface
} from '@/core/components/common/sheet';
import { ActivityFigure } from '@/core/components/dashboards/kit/meters';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { ShareRows } from '@/core/components/dashboards/kit/share-rows';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, type ShareRow } from '@/core/lib/utils/dashboard-figures';
import {
	type AppActivity,
	type AppShare,
	activitiesOfSlot,
	appSharesOf
} from '@/core/lib/utils/dashboards/app-activity';
import type { DiaryShot, DiarySlot } from '@/core/lib/utils/dashboards/work-diary';

const SHEET_SURFACE = cn(floatingSheetSurface, 'w-[min(30rem,calc(100vw-1rem))]');

const SECTION = 'flex flex-col gap-2 px-5 py-3';

const SECTION_HEADING = 'text-[13px] font-medium text-foreground';

const FACT_ROW = 'grid min-h-8 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 text-[13px]';

const SKELETON_APP_ROWS = 3;

function shareRowsOf(shares: ReadonlyArray<AppShare>): ShareRow<AppShare>[] {
	return shares.map((share) => ({
		key: share.key,
		item: share,
		value: share.seconds,
		share: share.share,
		isOther: false,
		otherCount: 0
	}));
}

function AppName({ share }: Readonly<{ share: AppShare }>) {
	return (
		<span className="flex min-w-0 items-baseline gap-1.5">
			<span className="truncate">{share.title}</span>
			{share.detail && <span className="truncate text-xs text-muted-foreground">{share.detail}</span>}
		</span>
	);
}

function renderAppName(share: AppShare) {
	return <AppName share={share} />;
}

function AppsSkeleton() {
	return (
		<ul aria-hidden="true" className="flex flex-col gap-3 py-1">
			{Array.from({ length: SKELETON_APP_ROWS }).map((_, index) => (
				<li key={index} className="flex items-center gap-3">
					<span className={cn('h-2.5 w-8', SKELETON_BAR)} />
					<span className={cn('h-2.5 flex-1', SKELETON_BAR)} />
					<span className={cn('h-2.5 w-10', SKELETON_BAR)} />
				</li>
			))}
		</ul>
	);
}

function pickedShotOf(shots: ReadonlyArray<DiaryShot>, pickedId: string | null) {
	const picked = shots.find((shot) => shot.id === pickedId);
	if (picked) {
		return picked;
	}
	return shots[0] ?? null;
}

function ShotViewer({ slot, timeFormat }: Readonly<{ slot: DiarySlot; timeFormat: Intl.DateTimeFormat }>) {
	const t = useTranslations();
	const [pickedId, setPickedId] = useState<string | null>(null);
	const shot = pickedShotOf(slot.shots, pickedId);
	const count = slot.shots.length;
	const hasSeveral = count > 1;
	if (!shot) {
		return (
			<div className="flex aspect-video items-center justify-center rounded-lg hairline-border border-dashed border-foreground/20 text-[13px] text-muted-foreground">
				{t('dashboard.timesheets.diary.NO_SCREENSHOT')}
			</div>
		);
	}
	const takenAt = shot.recordedAt ?? slot.start;
	const alt = t('dashboard.timesheets.diary.SHOT_ALT', { time: timeFormat.format(takenAt) });
	return (
		<div className="flex flex-col gap-2">
			<a
				href={shot.fullUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="relative block aspect-video overflow-hidden rounded-lg bg-foreground/5 hairline-ring ring-foreground/10 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<Image src={shot.fullUrl} alt={alt} width={960} height={600} className="size-full object-cover" />
				<span className="sr-only">{t('dashboard.timesheets.diary.OPEN_FULL')}</span>
			</a>
			{hasSeveral && (
				<ul className="flex flex-wrap gap-1.5">
					{slot.shots.map((item, index) => {
						const isPicked = item.id === shot.id;
						const position = index + 1;
						return (
							<li key={item.id}>
								<button
									type="button"
									aria-pressed={isPicked}
									aria-label={t('dashboard.timesheets.diary.SHOT_OF', { index: position, count })}
									onClick={() => setPickedId(item.id)}
									className={cn(
										'relative block h-10 w-16 overflow-hidden rounded-md bg-foreground/5 outline-none transition-opacity focus-visible:ring-[3px] focus-visible:ring-ring/25',
										isPicked && 'ring-2 ring-primary',
										!isPicked && 'opacity-60 hover:opacity-100'
									)}
								>
									<Image
										src={item.thumbUrl}
										alt=""
										width={128}
										height={80}
										className="size-full object-cover"
									/>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

function SlotBody({
	slot,
	activities,
	isAppsLoading,
	timeFormat
}: Readonly<{
	slot: DiarySlot;
	activities: ReadonlyArray<AppActivity>;
	isAppsLoading: boolean;
	timeFormat: Intl.DateTimeFormat;
}>) {
	const t = useTranslations();
	const shares = useMemo(() => {
		const ofSlot = activitiesOfSlot(activities, slot.id);
		return appSharesOf(ofSlot);
	}, [activities, slot.id]);
	const rows = useMemo(() => shareRowsOf(shares), [shares]);
	const hasApps = rows.length > 0;
	const showsNoApps = !hasApps && !isAppsLoading;
	const showsApps = hasApps && !isAppsLoading;
	return (
		<div className="min-h-0 flex-1 overflow-y-auto pb-4">
			<div className="px-5 pb-2">
				<ShotViewer key={slot.id} slot={slot} timeFormat={timeFormat} />
			</div>
			<section className={cn(SECTION, 'gap-0')}>
				<div className={FACT_ROW}>
					<span className="text-muted-foreground">{t('dashboard.timesheets.diary.TRACKED')}</span>
					<span className="tabular-nums text-foreground">{formatDurationShort(slot.seconds)}</span>
				</div>
				{slot.activityPercent !== null && (
					<div className={FACT_ROW}>
						<span className="text-muted-foreground">{t('dashboard.timesheets.diary.ACTIVITY')}</span>
						<ActivityFigure percent={slot.activityPercent} className="justify-start" />
					</div>
				)}
			</section>
			<section className={SECTION}>
				<h3 className={SECTION_HEADING}>{t('dashboard.timesheets.diary.APPS')}</h3>
				{isAppsLoading && <AppsSkeleton />}
				{showsNoApps && (
					<p className="text-xs text-muted-foreground text-pretty">
						{t('dashboard.timesheets.diary.NO_APPS')}
					</p>
				)}
				{showsApps && (
					<ShareRows
						rows={rows}
						renderName={renderAppName}
						formatValue={formatDurationShort}
						otherLabel={() => ''}
						className="-mx-4"
						density="narrow"
					/>
				)}
			</section>
		</div>
	);
}

/** One ten-minute slot of the work diary in the app's floating side sheet: its screenshots, figures and apps. */
export function DiarySlotSheet({
	slot,
	day,
	activities,
	isAppsLoading,
	isOpen,
	onClose
}: Readonly<{
	/** Kept after closing so the sheet slides out with its content. */
	slot: DiarySlot | null;
	day: Date;
	activities: ReadonlyArray<AppActivity>;
	isAppsLoading: boolean;
	isOpen: boolean;
	onClose: () => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const timeFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }), [locale]);
	const dayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }),
		[locale]
	);
	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			onClose();
		}
	};
	let title = '';
	if (slot) {
		const start = timeFormat.format(slot.start);
		const end = timeFormat.format(slot.end);
		title = t('dashboard.timesheets.diary.SLOT_TITLE', { start, end });
	}
	return (
		<Sheet open={isOpen} onOpenChange={handleOpenChange}>
			<SheetContent side="right" className={SHEET_SURFACE}>
				{slot && (
					<>
						<header className="flex flex-col gap-0.5 px-5 pt-5 pb-4 pr-14">
							<SheetTitle className="truncate text-base tabular-nums">{title}</SheetTitle>
							<SheetDescription className="truncate text-xs text-muted-foreground">
								{dayFormat.format(day)}
							</SheetDescription>
						</header>
						<SlotBody
							slot={slot}
							activities={activities}
							isAppsLoading={isAppsLoading}
							timeFormat={timeFormat}
						/>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}
