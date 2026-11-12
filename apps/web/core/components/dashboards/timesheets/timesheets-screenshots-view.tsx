'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { DiaryDayStrip, DiaryDayStripSkeleton } from '@/core/components/dashboards/work-diary/diary-day-strip';
import { DiaryBody, DiaryHoursSkeleton, diaryMetaOf } from '@/core/components/dashboards/work-diary/diary-hours';
import { DiarySlotSheet } from '@/core/components/dashboards/work-diary/diary-slot-sheet';
import { useWorkDiaryDay } from '@/core/hooks/dashboards/work-diary/use-work-diary-day';
import { cn } from '@/core/lib/helpers';
import { clampedDayOfPeriod, defaultDayOfPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import {
	type DiarySlot,
	diaryStripDaysOf,
	latestLogDayOf,
	trackedDayKeysOf
} from '@/core/lib/utils/dashboards/work-diary';
import type { SheetMember } from '@/core/lib/utils/dashboards/timesheets';
import {
	memberNameOrFallback,
	TimesheetsMemberPicker,
	TimesheetsMemberRail,
	TimesheetsMemberRailSkeleton
} from './timesheets-member-rail';
import { RAIL_CELL, SHEET_HEADER, WITH_RAIL } from './timesheets-sheet-view';

/** Drawn by the timesheets skeleton for this view: the member rail, the member header, the day strip, the hours. */
export function TimesheetsScreenshotsSkeleton() {
	return (
		<div aria-hidden="true" className={WITH_RAIL}>
			<div className={RAIL_CELL}>
				<div className="lg:absolute lg:inset-0">
					<TimesheetsMemberRailSkeleton />
				</div>
			</div>
			<div className="flex min-w-0 flex-col">
				<div className={SHEET_HEADER}>
					<span className="flex items-center gap-2.5">
						<span className="size-6 shrink-0 rounded-full bg-foreground/[0.06]" />
						<span className={cn('h-2.5 w-28', SKELETON_BAR)} />
					</span>
				</div>
				<div className="flex flex-col gap-4 px-4 pb-4">
					<DiaryDayStripSkeleton />
					<DiaryHoursSkeleton />
				</div>
			</div>
		</div>
	);
}

/** The one member the filter holds, then the viewer, then the first member with time in the period. */
function defaultMemberIdOf(
	members: ReadonlyArray<SheetMember>,
	preferredEmployeeId: string | null,
	ownEmployeeId: string | null
) {
	const ids = new Set(members.map((member) => member.id));
	const hasPreferred = Boolean(preferredEmployeeId) && ids.has(preferredEmployeeId ?? '');
	if (hasPreferred) {
		return preferredEmployeeId;
	}
	const hasOwn = Boolean(ownEmployeeId) && ids.has(ownEmployeeId ?? '');
	if (hasOwn) {
		return ownEmployeeId;
	}
	return members[0]?.id ?? null;
}

function shownMemberIdOf(
	members: ReadonlyArray<SheetMember>,
	pickedMemberId: string | null,
	preferredEmployeeId: string | null,
	ownEmployeeId: string | null
) {
	const isPickedKnown = members.some((member) => member.id === pickedMemberId);
	if (isPickedKnown) {
		return pickedMemberId;
	}
	return defaultMemberIdOf(members, preferredEmployeeId, ownEmployeeId);
}

interface PickedDay {
	memberId: string | null;
	day: Date;
}

/** A day picked for one member does not follow to the next: each member opens on their own latest day with time. */
function wantedDayOf(pickedDay: PickedDay | null, member: SheetMember | null, period: Period) {
	const memberId = member?.id ?? null;
	const isForMember = pickedDay !== null && pickedDay.memberId === memberId;
	if (isForMember) {
		return pickedDay.day;
	}
	const latest = latestLogDayOf(member?.logs ?? []);
	if (latest) {
		return latest;
	}
	return defaultDayOfPeriod(period, new Date());
}

/**
 * The screenshots of the members with time in the period: the members in the page's member rail (a menu below `lg`),
 * and the picked member's day in ten-minute slots, hour by hour, each slot with its screenshot, its activity and the
 * app it was spent in; a slot opens in a side sheet. The diary pieces are shared with the Work diary page, which shows
 * the signed-in person's own day. A browser timer records no screenshot, and the empty state says so.
 */
export function TimesheetsScreenshotsView({
	period,
	members,
	ownEmployeeId,
	preferredEmployeeId,
	teamId,
	emptyContent
}: Readonly<{
	period: Period;
	members: ReadonlyArray<SheetMember>;
	ownEmployeeId: string | null;
	preferredEmployeeId: string | null;
	teamId: string | null;
	emptyContent: ReactNode;
}>) {
	const locale = useLocale();
	const t = useTranslations();
	const [pickedMemberId, setPickedMemberId] = useState<string | null>(null);
	const [pickedDay, setPickedDay] = useState<PickedDay | null>(null);
	const [openSlot, setOpenSlot] = useState<DiarySlot | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);

	const employeeId = shownMemberIdOf(members, pickedMemberId, preferredEmployeeId, ownEmployeeId);
	const member = members.find((item) => item.id === employeeId) ?? null;
	const isOwn = employeeId === ownEmployeeId;
	const wantedDay = wantedDayOf(pickedDay, member, period);
	const day = clampedDayOfPeriod(wantedDay, period);
	const days = diaryStripDaysOf(period, day);
	const memberLogs = member?.logs ?? [];
	const trackedKeys = trackedDayKeysOf(memberLogs, employeeId);
	const state = useWorkDiaryDay({ employeeId, isOwn, teamId, day });

	const timeFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }), [locale]);
	const hourFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric' }), [locale]);
	const dayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
		[locale]
	);
	const dayText = dayFormat.format(day);

	const openSlotSheet = useCallback((slot: DiarySlot) => {
		setOpenSlot(slot);
		setIsSheetOpen(true);
	}, []);
	const closeSlotSheet = useCallback(() => setIsSheetOpen(false), []);
	const pickMember = useCallback((nextId: string) => {
		setPickedMemberId(nextId);
		setIsSheetOpen(false);
	}, []);
	const pickDay = (nextDay: Date) => {
		setPickedDay({ memberId: employeeId, day: nextDay });
	};

	if (!member) {
		return <>{emptyContent}</>;
	}

	const showsRail = members.length > 1;
	const memberName = memberNameOrFallback(member, t('dashboard.timesheets.SHEET.UNNAMED_MEMBER'));
	let body = (
		<DiaryBody
			diary={state.diary}
			activities={state.activities}
			dayText={dayText}
			timeFormat={timeFormat}
			hourFormat={hourFormat}
			onOpen={openSlotSheet}
		/>
	);
	if (state.isError) {
		body = <DashboardErrorNotice onRetry={() => void state.refetch()} />;
	}
	if (state.isLoading) {
		body = <DiaryHoursSkeleton />;
	}
	const isSettled = !state.isLoading && !state.isError;
	const hasSlots = state.diary.slotCount > 0;
	const showsMeta = isSettled && hasSlots;

	return (
		<div className={cn(showsRail && WITH_RAIL)}>
			{showsRail && (
				<div className={RAIL_CELL}>
					<div className="lg:absolute lg:inset-0">
						<TimesheetsMemberRail members={members} pickedId={member.id} onPick={pickMember} />
					</div>
				</div>
			)}
			<div className="flex min-w-0 flex-col" aria-busy={state.isLoading}>
				<div className={SHEET_HEADER}>
					<div className="flex min-w-0 items-center">
						{showsRail && (
							<span className="flex min-w-0 lg:hidden">
								<TimesheetsMemberPicker members={members} picked={member} onPick={pickMember} />
							</span>
						)}
						<MemberCell
							name={memberName}
							imageUrl={member.imageUrl}
							className={cn(showsRail && 'max-lg:hidden')}
						/>
					</div>
					{showsMeta && (
						<span className="truncate text-xs tabular-nums text-muted-foreground">
							{diaryMetaOf(state.diary, dayText, t)}
						</span>
					)}
				</div>
				<div className="flex flex-col gap-4 px-4 pb-4">
					<DiaryDayStrip days={days} day={day} trackedKeys={trackedKeys} period={period} onPick={pickDay} />
					{body}
				</div>
			</div>
			<DiarySlotSheet
				slot={openSlot}
				day={day}
				activities={state.activities}
				isAppsLoading={state.isAppsLoading}
				isOpen={isSheetOpen}
				onClose={closeSlotSheet}
			/>
		</div>
	);
}
