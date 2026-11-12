'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Check, Pencil, Spinner, Trash, X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { DAY_SUMMARY_SPAN, dayLabelSpanOf, logGridOf, WIDE_ONLY } from './timesheets-grid';

const SKELETON_DAYS = [4, 3];

const TASK_BAR_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-2/5'];

function taskBarWidthOf(index: number) {
	return TASK_BAR_WIDTHS[index % TASK_BAR_WIDTHS.length];
}

function SkeletonRow({ index, showsMember }: Readonly<{ index: number; showsMember: boolean }>) {
	return (
		<div className={cn(logGridOf(showsMember), 'min-h-11 py-1.5')}>
			<span className="size-4 rounded-[4px] bg-foreground/[0.06]" />
			<span className={cn('h-5 w-20 rounded-md bg-foreground/[0.05]', WIDE_ONLY)} />
			<span className={cn('h-2.5', SKELETON_BAR, taskBarWidthOf(index))} />
			<span className={cn('flex items-center gap-2', WIDE_ONLY)}>
				<span className="size-4 rounded-[28%] bg-foreground/[0.06]" />
				<span className={cn('h-2.5 w-20', SKELETON_BAR)} />
			</span>
			{showsMember && (
				<span className={cn('flex items-center gap-2', WIDE_ONLY)}>
					<span className="size-6 rounded-full bg-foreground/[0.06]" />
					<span className={cn('h-2.5 w-16', SKELETON_BAR)} />
				</span>
			)}
			<span className={cn('h-2.5 w-20', SKELETON_BAR, WIDE_ONLY)} />
			<span className={cn('ml-auto h-2.5 w-12', SKELETON_BAR)} />
			<span className="ml-auto size-5 rounded-md bg-foreground/[0.05]" />
		</div>
	);
}

/** The list while its first logs load: day headers and rows at their real height on the real columns. */
export function TimesheetsListSkeleton({ showsMember }: Readonly<{ showsMember: boolean }>) {
	return (
		<div aria-hidden="true" className="hairline-divide-y divide-border">
			{SKELETON_DAYS.map((rowCount, dayIndex) => {
				const firstRow = dayIndex * SKELETON_DAYS.length * 4;
				const rows = Array.from({ length: rowCount }, (_, index) => firstRow + index);
				return (
					<div key={dayIndex}>
						<div className={cn(logGridOf(showsMember), 'min-h-11')}>
							<span className="size-4 rounded-[4px] bg-foreground/[0.06]" />
							<span className={cn('flex items-center gap-2', dayLabelSpanOf(showsMember))}>
								<span className={cn('h-2.5 w-28', SKELETON_BAR)} />
							</span>
							<span className={cn('flex items-center justify-end gap-2', DAY_SUMMARY_SPAN)}>
								<span className={cn('h-2 w-10', SKELETON_BAR)} />
								<span className={cn('h-2.5 w-12', SKELETON_BAR)} />
							</span>
							<span />
						</div>
						<div className="hairline-t hairline-divide-y border-border divide-border">
							{rows.map((index) => (
								<SkeletonRow key={index} index={index} showsMember={showsMember} />
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}

/**
 * The bulk bar of a selection, floating over the bottom of the list like the projects page: the count, approve and
 * reject for those who may, edit when at least one selected log may be edited, delete when every selected log may
 * be deleted, and clear. On a narrow screen the bar scrolls sideways instead of running off both edges.
 */
export function TimesheetsSelectionBar({
	count,
	canApprove,
	canEdit,
	canDelete,
	isApproving,
	onApprove,
	onReject,
	onEdit,
	onDelete,
	onClear
}: Readonly<{
	count: number;
	canApprove: boolean;
	canEdit: boolean;
	canDelete: boolean;
	isApproving: boolean;
	onApprove: () => void;
	onReject: () => void;
	onEdit: () => void;
	onDelete: () => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	const label = t('dashboard.timesheets.SELECTED', { count });
	return (
		<div className="pointer-events-none sticky bottom-4 z-10 mt-4 flex justify-center">
			<div
				role="toolbar"
				aria-label={label}
				className="surface-raised pointer-events-auto flex h-11 max-w-full items-center gap-1 overflow-x-auto rounded-full py-1 pr-1.5 pl-4"
			>
				<span className="shrink-0 pr-2 text-[13px] font-medium tabular-nums text-foreground">{label}</span>
				<span className="h-4 w-px shrink-0 bg-border" />
				{canApprove && (
					<>
						<Button type="button" variant="ghost" size="default" onClick={onApprove} disabled={isApproving}>
							{isApproving && <Spinner className="animate-spin" />}
							{!isApproving && <Check />}
							<span>{t('dashboard.timesheets.APPROVE')}</span>
						</Button>
						<Button type="button" variant="ghost" size="default" onClick={onReject}>
							<X />
							<span>{t('dashboard.timesheets.REJECT')}</span>
						</Button>
					</>
				)}
				{canEdit && (
					<Button type="button" variant="ghost" size="default" onClick={onEdit}>
						<Pencil />
						<span>{t('common.EDIT')}</span>
					</Button>
				)}
				{canDelete && (
					<Button
						type="button"
						variant="ghost"
						size="default"
						onClick={onDelete}
						className="text-destructive-ink hover:bg-destructive/10 hover:text-destructive-ink"
					>
						<Trash />
						<span>{t('common.DELETE')}</span>
					</Button>
				)}
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={onClear}
					aria-label={t('dashboard.timesheets.CLEAR_SELECTION')}
					className="text-muted-foreground"
				>
					<X />
				</Button>
			</div>
		</div>
	);
}
