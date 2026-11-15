'use client';

import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Spinner } from '@/core/components/common/spinner';
import { Button } from '@/core/components/duplicated-components/_button';
import { PRESET_LABEL_KEYS } from '@/core/components/dashboards/kit/period-picker';
import { Check, ChevronDown, FolderOpen, Pencil, Refresh, Trash } from '@/core/components/icons';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import type { SavedReportsAvailability } from '@/core/hooks/dashboards/time-activity/use-saved-reports';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import { periodOfSavedReport } from '@/core/lib/utils/dashboards/saved-report';
import type { ISavedReport } from '@/core/types/interfaces/timesheet/saved-report';

function PeriodOfReport({ report }: Readonly<{ report: ISavedReport }>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	if (report.periodRule) {
		return <>{t(PRESET_LABEL_KEYS[report.periodRule])}</>;
	}
	const period = periodOfSavedReport(report);
	if (!period) {
		return null;
	}
	return <>{formatPeriod(period, locale)}</>;
}

function ReportRow({
	report,
	isActive,
	onOpen
}: Readonly<{ report: ISavedReport; isActive: boolean; onOpen: (report: ISavedReport) => void }>) {
	return (
		<DropdownMenuItem onClick={() => onOpen(report)} className="items-start gap-2 py-1.5">
			<span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
				{isActive && <Check className="size-4" aria-hidden="true" />}
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate" title={report.name}>
					{report.name}
				</span>
				<span className="truncate text-xs text-muted-foreground">
					<PeriodOfReport report={report} />
				</span>
			</span>
		</DropdownMenuItem>
	);
}

function MenuState({
	availability,
	hasReports,
	onRetry
}: Readonly<{ availability: SavedReportsAvailability; hasReports: boolean; onRetry: () => void }>) {
	const t = useTranslations();
	if (availability === 'loading') {
		return (
			<output className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
				<Spinner className="size-3.5" />
				<span>{t('dashboard.savedReports.LOADING')}</span>
			</output>
		);
	}
	if (availability === 'error') {
		return (
			<>
				<p className="px-2 py-2 text-xs text-muted-foreground">{t('dashboard.savedReports.LOAD_ERROR')}</p>
				<DropdownMenuItem onClick={onRetry}>
					<Refresh />
					<span>{t('dashboard.savedReports.TRY_AGAIN')}</span>
				</DropdownMenuItem>
			</>
		);
	}
	if (!hasReports) {
		return <p className="max-w-64 px-2 py-2 text-xs text-muted-foreground">{t('dashboard.savedReports.EMPTY')}</p>;
	}
	return null;
}

function ActiveReportActions({
	report,
	showsSavedView,
	isUpdating,
	onUpdate,
	onRename,
	onDelete
}: Readonly<{
	report: ISavedReport;
	showsSavedView: boolean;
	isUpdating: boolean;
	onUpdate: (report: ISavedReport) => void;
	onRename: (report: ISavedReport) => void;
	onDelete: (report: ISavedReport) => void;
}>) {
	const t = useTranslations();
	return (
		<>
			<DropdownMenuSeparator />
			<DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground" title={report.name}>
				{report.name}
			</DropdownMenuLabel>
			<DropdownMenuItem disabled={showsSavedView || isUpdating} onClick={() => onUpdate(report)}>
				<Check />
				<span>{t('dashboard.savedReports.UPDATE')}</span>
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onRename(report)}>
				<Pencil />
				<span>{t('dashboard.savedReports.RENAME')}</span>
			</DropdownMenuItem>
			<DropdownMenuItem variant="destructive" onClick={() => onDelete(report)}>
				<Trash />
				<span>{t('dashboard.savedReports.DELETE')}</span>
			</DropdownMenuItem>
		</>
	);
}

/**
 * The saved reports of the member, beside Save and Share: opening one sets the page to its period, filters and
 * grouping. The report the page was opened from (named in its link) can be updated with the view shown, renamed or
 * deleted from the same menu.
 */
export function SavedReportsMenu({
	reports,
	activeReport,
	availability,
	showsSavedView,
	isUpdating,
	onOpen,
	onUpdate,
	onRename,
	onDelete,
	onRetry
}: Readonly<{
	reports: ReadonlyArray<ISavedReport>;
	activeReport: ISavedReport | null;
	availability: SavedReportsAvailability;
	showsSavedView: boolean;
	/** A change of a saved report is waiting for its answer: Update waits for it. */
	isUpdating: boolean;
	onOpen: (report: ISavedReport) => void;
	onUpdate: (report: ISavedReport) => void;
	onRename: (report: ISavedReport) => void;
	onDelete: (report: ISavedReport) => void;
	onRetry: () => void;
}>) {
	const t = useTranslations();
	const hasReports = reports.length > 0;
	const isReady = availability === 'ready';
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" variant="outline" size="default" aria-label={t('dashboard.savedReports.MENU')}>
					<FolderOpen />
					<span className="max-sm:sr-only">{t('dashboard.savedReports.MENU')}</span>
					<ChevronDown className="text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
				<DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
					{t('dashboard.savedReports.MENU')}
				</DropdownMenuLabel>
				<MenuState availability={availability} hasReports={hasReports} onRetry={onRetry} />
				{isReady && (
					<div className="max-h-72 overflow-y-auto">
						{reports.map((report) => (
							<ReportRow
								key={report.id}
								report={report}
								isActive={report.id === activeReport?.id}
								onOpen={onOpen}
							/>
						))}
					</div>
				)}
				{activeReport && (
					<ActiveReportActions
						report={activeReport}
						showsSavedView={showsSavedView}
						isUpdating={isUpdating}
						onUpdate={onUpdate}
						onRename={onRename}
						onDelete={onDelete}
					/>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
