'use client';

import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { AppDialog, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { DialogDescription, DialogTitle } from '@/core/components/common/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Spinner } from '@/core/components/common/spinner';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown, Copy, Info, Plus, X } from '@/core/components/icons';
import { TaskPickerMenu } from '@/core/components/tasks/detail/task-picker-menu';
import type { CopyPreviousWeek } from '@/core/hooks/dashboards/timesheets/use-copy-previous-week';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { CellLock } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const ADD_ROW_TRIGGER =
	'flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.03] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-expanded:bg-foreground/[0.03] aria-expanded:text-foreground [&_svg]:size-3.5 [&_svg]:shrink-0';

const MENU_HINT = 'text-xs text-muted-foreground';

export function SheetAddRow({
	tasks,
	isTaskShown,
	onPick
}: Readonly<{
	tasks: TTask[];
	isTaskShown: (task: TTask) => boolean;
	onPick: (task: TTask) => void;
}>) {
	const t = useTranslations();
	return (
		<TaskPickerMenu
			tasks={tasks}
			onPick={onPick}
			isSelected={isTaskShown}
			searchPlaceholder={t('dashboard.timesheets.SHEET.EDIT.ADD_ROW_SEARCH')}
			triggerLabel={t('dashboard.timesheets.SHEET.EDIT.ADD_ROW')}
			triggerClassName={ADD_ROW_TRIGGER}
		>
			<Plus aria-hidden="true" />
			<span>{t('dashboard.timesheets.SHEET.EDIT.ADD_ROW')}</span>
		</TaskPickerMenu>
	);
}

export function SheetRemoveRowButton({ taskName, onRemove }: Readonly<{ taskName: string; onRemove: () => void }>) {
	const t = useTranslations();
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			onClick={onRemove}
			aria-label={t('dashboard.timesheets.SHEET.EDIT.REMOVE_ROW', { task: taskName })}
			className="size-6 shrink-0 text-muted-foreground [&_svg]:size-3.5"
		>
			<X />
		</Button>
	);
}

function CopyIcon({ isBusy }: Readonly<{ isBusy: boolean }>) {
	if (isBusy) {
		return <Spinner className="size-4" />;
	}
	return <Copy />;
}

export function SheetCopyWeekMenu({ copyWeek }: Readonly<{ copyWeek: CopyPreviousWeek }>) {
	const t = useTranslations();
	const isBusy = copyWeek.isReading || copyWeek.isRunning;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" variant="outline" size="default" disabled={isBusy}>
					<CopyIcon isBusy={isBusy} />
					<span>{t('dashboard.timesheets.SHEET.COPY.MENU')}</span>
					<ChevronDown className="text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuItem onClick={() => void copyWeek.copyRows()} className="items-start">
					<span className="flex min-w-0 flex-col gap-0.5">
						<span>{t('dashboard.timesheets.SHEET.COPY.ROWS')}</span>
						<span className={MENU_HINT}>{t('dashboard.timesheets.SHEET.COPY.ROWS_HINT')}</span>
					</span>
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => void copyWeek.prepareRowsAndTime()} className="items-start">
					<span className="flex min-w-0 flex-col gap-0.5">
						<span>{t('dashboard.timesheets.SHEET.COPY.ROWS_AND_TIME')}</span>
						<span className={MENU_HINT}>{t('dashboard.timesheets.SHEET.COPY.ROWS_AND_TIME_HINT')}</span>
					</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function SheetCopyConfirmDialog({ copyWeek }: Readonly<{ copyWeek: CopyPreviousWeek }>) {
	const t = useTranslations();
	const pending = copyWeek.pendingCopy;
	const isOpen = Boolean(pending);
	const cellCount = pending?.plans.length ?? 0;
	const lockedCount = pending?.lockedCount ?? 0;
	const total = formatDurationShort(pending?.totalSeconds ?? 0);
	const hasLocked = lockedCount > 0;

	return (
		<AppDialog open={isOpen} onClose={copyWeek.cancelCopy} width="sm">
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-5 pb-5">
				<div className="flex items-start justify-between gap-3">
					<span
						aria-hidden="true"
						className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.08] text-primary-ink hairline-ring ring-primary/20 [&_svg]:size-4.5"
					>
						<Copy />
					</span>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={copyWeek.cancelCopy}
						aria-label={t('common.CLOSE')}
						className="-mt-1 -mr-2 text-muted-foreground"
					>
						<X />
					</Button>
				</div>
				<DialogTitle className="mt-3 text-[15px] font-semibold text-balance text-foreground">
					{t('dashboard.timesheets.SHEET.COPY.CONFIRM_TITLE')}
				</DialogTitle>
				<DialogDescription className="mt-1 text-[13px] text-pretty text-muted-foreground">
					{t('dashboard.timesheets.SHEET.COPY.CONFIRM_BODY', { total, count: cellCount })}
				</DialogDescription>
				{hasLocked && (
					<p className="mt-3 flex items-start gap-2 rounded-xl bg-foreground/[0.03] px-3.5 py-3 text-[13px] leading-5 text-foreground">
						<Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
						<span>{t('dashboard.timesheets.SHEET.COPY.CONFIRM_LOCKED', { count: lockedCount })}</span>
					</p>
				)}
			</div>
			<div className={APP_DIALOG_FOOTER}>
				<Button
					type="button"
					variant="ghost"
					onClick={copyWeek.cancelCopy}
					data-initial-focus=""
					className="ml-auto"
				>
					{t('common.CANCEL')}
				</Button>
				<Button type="button" variant="default" onClick={() => void copyWeek.confirmCopy()}>
					{t('dashboard.timesheets.SHEET.COPY.CONFIRM_ACTION', { total })}
				</Button>
			</div>
		</AppDialog>
	);
}

const NOTICE_KEYS: Partial<Record<CellLock, string>> = {
	filtered: 'dashboard.timesheets.SHEET.EDIT.NOTICE_FILTERED',
	permission: 'dashboard.timesheets.SHEET.EDIT.NOTICE_PERMISSION',
	manualTimeOff: 'dashboard.timesheets.SHEET.EDIT.NOTICE_MANUAL_TIME_OFF'
};

export function SheetEditNotice({ lock, onClearFilters }: Readonly<{ lock: CellLock; onClearFilters: () => void }>) {
	const t = useTranslations();
	const key = NOTICE_KEYS[lock];
	if (!key) {
		return null;
	}
	const isFiltered = lock === 'filtered';
	const message = t(key as DottedLanguageObjectStringPaths);
	return (
		<p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pb-2 text-xs text-muted-foreground">
			<Info aria-hidden="true" className="size-3.5 shrink-0" />
			<span>{message}</span>
			{isFiltered && (
				<Button type="button" variant="link" size="sm" onClick={onClearFilters} className="h-auto px-0 text-xs">
					{t('common.CLEAR_FILTERS')}
				</Button>
			)}
		</p>
	);
}
