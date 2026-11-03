'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Check, Info, Spinner, Trash, X } from '@/core/components/icons';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { TimesheetStatusGlyph } from './timesheet-status';

const META_SEPARATOR = '·';

function ApproveIcon({ isApproving }: Readonly<{ isApproving: boolean }>) {
	if (isApproving) {
		return <Spinner className="animate-spin" />;
	}
	return <Check />;
}

function Summary({ children }: Readonly<{ children: ReactNode }>) {
	return <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] text-foreground">{children}</p>;
}

export interface SheetSelectionActions {
	count: number;
	seconds: number;
	canDelete: boolean;
	onApprove: () => void;
	onReject: () => void;
	onDelete: () => void;
	onClear: () => void;
}

export interface SheetPendingActions {
	count: number;
	seconds: number;
	memberName: string;
	onApprove: () => void;
	onReject: () => void;
}

/**
 * The closing strip of the sheet, with the approval actions: for the logs selected when there are some, otherwise
 * for the member's logs waiting for approval. Approve applies at once; Reject opens the reason dialog. It says once
 * that Gauzy decides on whole timesheets.
 */
export function TimesheetsSheetFooter({
	selection,
	pending,
	canApprove,
	isApproving
}: Readonly<{
	selection: SheetSelectionActions;
	pending: SheetPendingActions;
	canApprove: boolean;
	isApproving: boolean;
}>) {
	const t = useTranslations();
	const hasSelection = selection.count > 0;
	const hasPending = pending.count > 0;
	const hasSomethingToAct = hasSelection || hasPending;
	if (!hasSomethingToAct) {
		return null;
	}

	let summary: ReactNode;
	let actions: ReactNode = null;
	if (hasSelection) {
		summary = (
			<Summary>
				<span className="font-medium tabular-nums">
					{t('dashboard.timesheets.SELECTED', { count: selection.count })}
				</span>
				<span aria-hidden="true" className="text-muted-foreground">
					{META_SEPARATOR}
				</span>
				<span className="tabular-nums text-muted-foreground">{formatDurationShort(selection.seconds)}</span>
			</Summary>
		);
		actions = (
			<>
				{canApprove && (
					<>
						<Button
							type="button"
							variant="default"
							size="default"
							onClick={selection.onApprove}
							disabled={isApproving}
						>
							<ApproveIcon isApproving={isApproving} />
							<span>{t('dashboard.timesheets.APPROVE')}</span>
						</Button>
						<Button type="button" variant="outline" size="default" onClick={selection.onReject}>
							<X />
							<span>{t('dashboard.timesheets.REJECT')}</span>
						</Button>
					</>
				)}
				{selection.canDelete && (
					<Button
						type="button"
						variant="ghost"
						size="default"
						onClick={selection.onDelete}
						className="text-destructive-ink hover:bg-destructive/10 hover:text-destructive-ink"
					>
						<Trash />
						<span>{t('common.DELETE')}</span>
					</Button>
				)}
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={selection.onClear}
					aria-label={t('dashboard.timesheets.CLEAR_SELECTION')}
					className="text-muted-foreground"
				>
					<X />
				</Button>
			</>
		);
	} else {
		summary = (
			<Summary>
				<TimesheetStatusGlyph status={ETimesheetStatus.PENDING} className="size-4 shrink-0" />
				<span>{t('dashboard.timesheets.SHEET.PENDING_SUMMARY', { count: pending.count })}</span>
				<span aria-hidden="true" className="text-muted-foreground">
					{META_SEPARATOR}
				</span>
				<span className="font-medium tabular-nums">{formatDurationShort(pending.seconds)}</span>
			</Summary>
		);
		if (canApprove) {
			actions = (
				<>
					<Button
						type="button"
						variant="default"
						size="default"
						onClick={pending.onApprove}
						disabled={isApproving}
						aria-label={t('dashboard.timesheets.SHEET.APPROVE_PENDING', { name: pending.memberName })}
					>
						<ApproveIcon isApproving={isApproving} />
						<span>{t('dashboard.timesheets.APPROVE')}</span>
					</Button>
					<Button
						type="button"
						variant="outline"
						size="default"
						onClick={pending.onReject}
						aria-label={t('dashboard.timesheets.SHEET.REJECT_PENDING', { name: pending.memberName })}
					>
						<X />
						<span>{t('dashboard.timesheets.REJECT')}</span>
					</Button>
				</>
			);
		}
	}
	const hasActions = Boolean(actions);

	return (
		<div className="flex flex-col gap-2 px-4 pt-4 pb-3">
			<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
				{summary}
				{hasActions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
			</div>
			{canApprove && (
				<p className="flex items-start gap-1.5 text-xs text-muted-foreground">
					<Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
					<span>{t('dashboard.timesheets.SHEET.WHOLE_TIMESHEETS')}</span>
				</p>
			)}
		</div>
	);
}
