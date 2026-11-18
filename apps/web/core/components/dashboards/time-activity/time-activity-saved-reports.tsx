'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertDialogConfirmation } from '@/core/components/common/alert-dialog-confirmation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { DropdownMenuItem } from '@/core/components/common/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Button } from '@/core/components/duplicated-components/_button';
import { Bookmark, Share } from '@/core/components/icons';
import { useCallbackRef } from '@/core/hooks/common/use-callback-ref';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { useWorkspaceWeekStart } from '@/core/hooks/common/use-workspace-week-start';
import type { TimeActivityReport } from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import { type SavedReports, useSavedReports } from '@/core/hooks/dashboards/time-activity/use-saved-reports';
import {
	type SavedReportLabelsSupport,
	useSavedReportLabelsSupport
} from '@/core/hooks/dashboards/time-activity/use-saved-report-labels-support';
import { APPLICATION_DEFAULT_LANGUAGE } from '@/core/constants/config/constants';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import {
	SAVED_REPORT_PARAM,
	type TimeActivityView,
	canSaveView,
	canUpdateReport,
	linkParamsOfSavedReport,
	linkUsesEntryLabels,
	savedReportInputOf,
	savedReportUsesEntryLabels,
	shareExpiryOf,
	sharedReportUrlOf,
	showsSavedView,
	viewUsesEntryLabels
} from '@/core/lib/utils/dashboards/saved-report';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import type { ISavedReport } from '@/core/types/interfaces/timesheet/saved-report';
import { SavedReportNameForm } from './saved-report-name-form';
import { SavedReportSharePanel, type ShareLinkActions } from './saved-report-share-panel';
import { SavedReportsMenu } from './saved-reports-menu';

const FORBIDDEN = 403;

const POPOVER_PANEL = 'flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 p-3';

function useView(report: TimeActivityReport): TimeActivityView {
	const { period, settings } = report;
	return useMemo(
		() => ({ period, filters: settings.filters, grouping: settings.grouping }),
		[period, settings.filters, settings.grouping]
	);
}

function isShowingSavedView(
	report: ISavedReport | null,
	view: TimeActivityView,
	weekStart: ReturnType<typeof useWorkspaceWeekStart>
) {
	if (!report) {
		return false;
	}
	return showsSavedView(report, view, weekStart);
}

/** Replaces the whole view of the page link with the one of the report, in one move. */
function openReportIn(setLinkParams: TimeActivityReport['settings']['setLinkParams'], report: ISavedReport) {
	setLinkParams((next) => {
		// A copy of the names: deleting from the live list while walking it would skip the name after each one deleted
		for (const key of new Set(next.keys())) {
			next.delete(key);
		}
		for (const [key, value] of linkParamsOfSavedReport(report)) {
			next.set(key, value);
		}
	});
}

/**
 * Why a view narrowed or grouped by labels is not saved (`canSaveView`): Gauzy is still being asked whether saved
 * reports keep labels, could not be asked (with a retry), or keeps none. Where they are kept, labels block nothing and
 * there is nothing to say.
 */
function LabelsNote({
	support,
	onRetry,
	isInMenu = false
}: Readonly<{
	support: SavedReportLabelsSupport;
	onRetry: () => void;
	/** In the Saved reports menu, Try again is one of its items, so the keyboard reaches it as it reaches the others. */
	isInMenu?: boolean;
}>) {
	const t = useTranslations();
	if (support === 'kept') {
		return null;
	}
	if (support === 'checking') {
		return <p className="text-xs text-muted-foreground">{t('dashboard.savedReports.LABELS_CHECKING')}</p>;
	}
	if (support === 'failed') {
		const retry = isInMenu ? (
			<DropdownMenuItem onClick={onRetry}>{t('dashboard.savedReports.TRY_AGAIN')}</DropdownMenuItem>
		) : (
			<Button type="button" variant="outline" size="sm" onClick={onRetry}>
				{t('dashboard.savedReports.TRY_AGAIN')}
			</Button>
		);
		return (
			<div className="flex flex-col items-start gap-1">
				<p className="text-xs text-muted-foreground">{t('dashboard.savedReports.LABELS_CHECK_FAILED')}</p>
				{retry}
			</div>
		);
	}
	return <p className="text-xs text-muted-foreground">{t('dashboard.savedReports.LABELS_NOT_KEPT')}</p>;
}

function SaveButton({
	onSave,
	isSaving,
	canSave,
	labelsNote
}: Readonly<{
	onSave: (name: string) => Promise<boolean>;
	isSaving: boolean;
	canSave: boolean;
	/** Why the view cannot be saved, when it cannot. */
	labelsNote: ReactNode;
}>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const save = async (name: string) => {
		const isSaved = await onSave(name);
		if (isSaved) {
			setIsOpen(false);
		}
	};
	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button type="button" variant="outline" size="default" aria-label={t('dashboard.savedReports.SAVE')}>
					<Bookmark />
					<span className="max-sm:sr-only">{t('dashboard.savedReports.SAVE')}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} className={POPOVER_PANEL}>
				<div className="flex flex-col gap-1">
					<p className="text-[13px] font-medium text-foreground">{t('dashboard.savedReports.SAVE_TITLE')}</p>
					{canSave && (
						<p className="text-xs text-muted-foreground">{t('dashboard.savedReports.SAVE_HINT')}</p>
					)}
					{!canSave && labelsNote}
				</div>
				{canSave && (
					<SavedReportNameForm
						submitLabel={t('dashboard.savedReports.SAVE')}
						isSubmitting={isSaving}
						onSubmit={(name) => void save(name)}
						onCancel={() => setIsOpen(false)}
					/>
				)}
			</PopoverContent>
		</Popover>
	);
}

function ShareButton({
	activeReport,
	saved,
	onSave,
	isSaving,
	canSave,
	labelsNote,
	shareActionsOf,
	urlOf
}: Readonly<{
	activeReport: ISavedReport | null;
	saved: SavedReports;
	onSave: (name: string) => Promise<boolean>;
	isSaving: boolean;
	/**
	 * The view shown can be saved. Without an open report, Share saves the view first, so a view that cannot be saved
	 * offers no save there either; the link of a report already open still shares that report as it was saved.
	 */
	canSave: boolean;
	/** Why the view cannot be saved, when it cannot. */
	labelsNote: ReactNode;
	shareActionsOf: (report: ISavedReport) => ShareLinkActions;
	urlOf: (report: ISavedReport) => string | null;
}>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button type="button" variant="outline" size="default" aria-label={t('dashboard.savedReports.SHARE')}>
					<Share />
					<span className="max-sm:sr-only">{t('dashboard.savedReports.SHARE')}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} className={POPOVER_PANEL}>
				{activeReport && (
					<SavedReportSharePanel
						key={`${activeReport.id}:${activeReport.shareExpiresAt ?? ''}`}
						report={activeReport}
						url={urlOf(activeReport)}
						locale={locale}
						actions={shareActionsOf(activeReport)}
					/>
				)}
				{!activeReport && (
					<>
						<div className="flex flex-col gap-1">
							<p className="text-[13px] font-medium text-foreground">
								{t('dashboard.savedReports.SHARE_TITLE')}
							</p>
							<p className="text-xs text-muted-foreground">
								{t('dashboard.savedReports.SHARE_NEEDS_SAVE')}
							</p>
							{!canSave && labelsNote}
						</div>
						{canSave && (
							<SavedReportNameForm
								submitLabel={t('dashboard.savedReports.SAVE')}
								isSubmitting={isSaving || saved.availability === 'loading'}
								onSubmit={(name) => void onSave(name)}
							/>
						)}
					</>
				)}
			</PopoverContent>
		</Popover>
	);
}

/**
 * Saved reports, Save and Share, beside Export on the Time & activity page. They show once the list is read (or could
 * not be): against an API without saved reports (its list answers 404) none of them shows, and the page works as
 * before.
 */
export function TimeActivitySavedReports({ report }: Readonly<{ report: TimeActivityReport }>) {
	const t = useTranslations();
	const appLocale = useLocale();
	const weekStart = useWorkspaceWeekStart();
	const view = useView(report);
	const { setLinkParams } = report.settings;
	// A write that ends after the link moved (a filter picked meanwhile) changes the link as it is then
	const latestSetLinkParams = useCallbackRef(setLinkParams);
	const saved = useSavedReports({
		tenantId: report.user?.tenantId,
		organizationId: report.user?.employee?.organizationId,
		userId: report.user?.id
	});
	const [renaming, setRenaming] = useState<ISavedReport | null>(null);
	const [deleting, setDeleting] = useState<ISavedReport | null>(null);

	// Read from the link the view is read from: opening another report changes both at once, never the view alone
	const activeId = report.settings.linkParams.get(SAVED_REPORT_PARAM) ?? null;
	const activeReport = saved.reports.find((candidate) => candidate.id === activeId) ?? null;
	const isActiveViewSaved = isShowingSavedView(activeReport, view, weekStart);
	// Shown once the API answered: an API without saved reports (its list answers 404) never shows them
	const isAnswered = saved.availability === 'ready' || saved.availability === 'error';
	// Labels of entries are kept by a Gauzy with ever-gauzy#12073 only: Gauzy is asked once the view, its link or the
	// report it was opened from uses them, and once its saved reports answered (an API without them answers its 404 to
	// every saved report route)
	const linkUsesLabels = linkUsesEntryLabels(report.settings.linkParams);
	const usesEntryLabels = viewUsesEntryLabels(view) || linkUsesLabels || savedReportUsesEntryLabels(activeReport);
	const labelsSupport = useSavedReportLabelsSupport(usesEntryLabels && isAnswered);
	const { keepsEntryLabels } = labelsSupport;
	const labelsNote = <LabelsNote support={labelsSupport.support} onRetry={labelsSupport.retry} />;
	const menuLabelsNote = <LabelsNote support={labelsSupport.support} onRetry={labelsSupport.retry} isInMenu />;
	// A link that asks for labels shows them only once entries are known to have labels: until then, or when that could
	// not be read, the view shown is a stand-in without them, never saved nor written over a report
	const isLabelsAnswerPending = labelsSupport.support === 'checking' || labelsSupport.support === 'failed';
	const awaitsLinkedLabels = linkUsesLabels && !viewUsesEntryLabels(view) && isLabelsAnswerPending;
	// Elsewhere a view narrowed or grouped by labels would be saved as another view: it is neither saved nor written
	// over a report
	const canSave = canSaveView(view, keepsEntryLabels) && !awaitsLinkedLabels;
	const canUpdate = activeReport
		? canUpdateReport(activeReport, view, keepsEntryLabels) && !awaitsLinkedLabels
		: canSave;

	const saveView = useCallback(
		async (name: string) => {
			if (!canSaveView(view, keepsEntryLabels) || awaitsLinkedLabels) {
				return false;
			}
			const input = savedReportInputOf(view, weekStart, getDefaultTimezone());
			const savedFrom = activeId;
			try {
				const created = await saved.create.mutateAsync({ ...input, name });
				latestSetLinkParams.current((next) => {
					// A report opened while the save was pending stays the one the link names
					const isStillFrom = (next.get(SAVED_REPORT_PARAM) ?? null) === savedFrom;
					if (isStillFrom) {
						next.set(SAVED_REPORT_PARAM, created.id);
					}
				});
				toast.success(t('dashboard.savedReports.SAVED', { name: created.name }));
				return true;
			} catch {
				toast.error(t('dashboard.savedReports.SAVE_FAILED'));
				return false;
			}
		},
		[activeId, awaitsLinkedLabels, keepsEntryLabels, latestSetLinkParams, saved.create, t, view, weekStart]
	);

	const openReport = useCallback((target: ISavedReport) => openReportIn(setLinkParams, target), [setLinkParams]);

	const updateReport = useCallback(
		async (target: ISavedReport) => {
			// One change at a time: a second one could reach the API first and be overwritten by the earlier view. A view
			// the report cannot keep never replaces the one it keeps
			const isRefused =
				saved.update.isPending || awaitsLinkedLabels || !canUpdateReport(target, view, keepsEntryLabels);
			if (isRefused) {
				return;
			}
			const input = savedReportInputOf(view, weekStart, getDefaultTimezone());
			try {
				await saved.update.mutateAsync({ id: target.id, input });
				toast.success(t('dashboard.savedReports.UPDATED', { name: target.name }));
			} catch {
				toast.error(t('dashboard.savedReports.SAVE_FAILED'));
			}
		},
		[awaitsLinkedLabels, keepsEntryLabels, saved.update, t, view, weekStart]
	);

	const renameReport = useCallback(
		async (name: string) => {
			if (!renaming) {
				return;
			}
			try {
				await saved.update.mutateAsync({ id: renaming.id, input: { name } });
				toast.success(t('dashboard.savedReports.RENAMED'));
				setRenaming(null);
			} catch {
				toast.error(t('dashboard.savedReports.SAVE_FAILED'));
			}
		},
		[renaming, saved.update, t]
	);

	const deleteReport = useCallback(async () => {
		if (!deleting) {
			return;
		}
		const deletedId = deleting.id;
		try {
			await saved.remove.mutateAsync(deletedId);
			// Only a link that still names the deleted report loses that name; anything else in it stays as it is now
			latestSetLinkParams.current((next) => {
				if (next.get(SAVED_REPORT_PARAM) === deletedId) {
					next.delete(SAVED_REPORT_PARAM);
				}
			});
			toast.success(t('dashboard.savedReports.DELETED', { name: deleting.name }));
			setDeleting(null);
		} catch {
			toast.error(t('dashboard.savedReports.DELETE_FAILED'));
		}
	}, [deleting, latestSetLinkParams, saved.remove, t]);

	const urlOf = useCallback(
		(target: ISavedReport) => {
			const token = saved.linkTokens[target.id];
			if (!token) {
				return null;
			}
			if (typeof window === 'undefined') {
				return null;
			}
			return sharedReportUrlOf(window.location.origin, token, appLocale, APPLICATION_DEFAULT_LANGUAGE);
		},
		[appLocale, saved.linkTokens]
	);

	const shareActionsOf = useCallback(
		(target: ISavedReport): ShareLinkActions => ({
			isTurningOn: saved.share.isPending,
			isTurningOff: saved.unshare.isPending,
			isSavingAmounts: saved.update.isPending,
			onTurnOn: async (endDay) => {
				try {
					await saved.share.mutateAsync({ id: target.id, expiresAt: shareExpiryOf(endDay) });
				} catch (error) {
					const isRefused = errorStatusOf(error) === FORBIDDEN;
					if (isRefused) {
						toast.error(t('dashboard.savedReports.SHARE_REFUSED'));
						return;
					}
					toast.error(t('dashboard.savedReports.SHARE_FAILED'));
				}
			},
			onTurnOff: async () => {
				try {
					await saved.unshare.mutateAsync(target.id);
					toast.success(t('dashboard.savedReports.TURNED_OFF'));
				} catch {
					toast.error(t('dashboard.savedReports.SHARE_FAILED'));
				}
			},
			onIncludeAmountsChange: async (includeAmounts) => {
				// The switch waits for its last change: two writes in flight could land in the wrong order
				if (saved.update.isPending) {
					return;
				}
				try {
					await saved.update.mutateAsync({ id: target.id, input: { includeAmounts } });
				} catch {
					toast.error(t('dashboard.savedReports.SAVE_FAILED'));
				}
			},
			onCopy: async (url) => {
				try {
					await navigator.clipboard.writeText(url);
					toast.success(t('dashboard.savedReports.COPIED'));
				} catch {
					toast.error(t('dashboard.savedReports.COPY_FAILED'));
				}
			}
		}),
		[saved.share, saved.unshare, saved.update, t]
	);

	// Shown once the API answered: an API without saved reports never shows them, not even for a moment
	if (!isAnswered) {
		return null;
	}

	return (
		<>
			<SavedReportsMenu
				reports={saved.reports}
				activeReport={activeReport}
				availability={saved.availability}
				showsSavedView={isActiveViewSaved}
				canUpdate={canUpdate}
				cannotUpdateNote={menuLabelsNote}
				isUpdating={saved.update.isPending}
				onOpen={openReport}
				onUpdate={(target) => void updateReport(target)}
				onRename={setRenaming}
				onDelete={setDeleting}
				onRetry={() => void saved.retry()}
			/>
			<SaveButton onSave={saveView} isSaving={saved.create.isPending} canSave={canSave} labelsNote={labelsNote} />
			<ShareButton
				activeReport={activeReport}
				saved={saved}
				onSave={saveView}
				isSaving={saved.create.isPending}
				canSave={canSave}
				labelsNote={labelsNote}
				shareActionsOf={shareActionsOf}
				urlOf={urlOf}
			/>
			<Dialog open={renaming !== null} onOpenChange={(isOpen) => !isOpen && setRenaming(null)}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>{t('dashboard.savedReports.RENAME_TITLE')}</DialogTitle>
					</DialogHeader>
					{renaming && (
						<SavedReportNameForm
							initialName={renaming.name}
							submitLabel={t('dashboard.savedReports.RENAME')}
							isSubmitting={saved.update.isPending}
							onSubmit={(name) => void renameReport(name)}
							onCancel={() => setRenaming(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
			<AlertDialogConfirmation
				isOpen={deleting !== null}
				onOpenChange={(isOpen) => !isOpen && setDeleting(null)}
				title={t('dashboard.savedReports.DELETE_TITLE', { name: deleting?.name ?? '' })}
				description={t('dashboard.savedReports.DELETE_DESCRIPTION')}
				confirmText={t('dashboard.savedReports.DELETE')}
				onConfirm={() => void deleteReport()}
				onCancel={() => setDeleting(null)}
				loading={saved.remove.isPending}
			/>
		</>
	);
}
