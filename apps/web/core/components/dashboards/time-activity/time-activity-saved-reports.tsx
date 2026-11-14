'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertDialogConfirmation } from '@/core/components/common/alert-dialog-confirmation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Button } from '@/core/components/duplicated-components/_button';
import { Bookmark, Share } from '@/core/components/icons';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { useWorkspaceWeekStart } from '@/core/hooks/common/use-workspace-week-start';
import type { TimeActivityReport } from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import { type SavedReports, useSavedReports } from '@/core/hooks/dashboards/time-activity/use-saved-reports';
import { APPLICATION_DEFAULT_LANGUAGE } from '@/core/constants/config/constants';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import {
	SAVED_REPORT_PARAM,
	type TimeActivityView,
	linkParamsOfSavedReport,
	savedReportInputOf,
	shareExpiryOf,
	sharedReportUrlOf,
	showsSavedView
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
		for (const key of [...next.keys()]) {
			next.delete(key);
		}
		for (const [key, value] of linkParamsOfSavedReport(report)) {
			next.set(key, value);
		}
	});
}

function SaveButton({ onSave, isSaving }: Readonly<{ onSave: (name: string) => Promise<boolean>; isSaving: boolean }>) {
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
					<p className="text-xs text-muted-foreground">{t('dashboard.savedReports.SAVE_HINT')}</p>
				</div>
				<SavedReportNameForm
					submitLabel={t('dashboard.savedReports.SAVE')}
					isSubmitting={isSaving}
					onSubmit={(name) => void save(name)}
					onCancel={() => setIsOpen(false)}
				/>
			</PopoverContent>
		</Popover>
	);
}

function ShareButton({
	activeReport,
	saved,
	onSave,
	isSaving,
	shareActionsOf,
	urlOf
}: Readonly<{
	activeReport: ISavedReport | null;
	saved: SavedReports;
	onSave: (name: string) => Promise<boolean>;
	isSaving: boolean;
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
						</div>
						<SavedReportNameForm
							submitLabel={t('dashboard.savedReports.SAVE')}
							isSubmitting={isSaving || saved.availability === 'loading'}
							onSubmit={(name) => void onSave(name)}
						/>
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
	const searchParams = useSearchParams();
	const view = useView(report);
	const { setLinkParams } = report.settings;
	const saved = useSavedReports({
		tenantId: report.user?.tenantId,
		organizationId: report.user?.employee?.organizationId,
		userId: report.user?.id
	});
	const [renaming, setRenaming] = useState<ISavedReport | null>(null);
	const [deleting, setDeleting] = useState<ISavedReport | null>(null);

	const activeId = searchParams?.get(SAVED_REPORT_PARAM) ?? null;
	const activeReport = saved.reports.find((candidate) => candidate.id === activeId) ?? null;
	const isActiveViewSaved = isShowingSavedView(activeReport, view, weekStart);

	const saveView = useCallback(
		async (name: string) => {
			const input = savedReportInputOf(view, weekStart, getDefaultTimezone());
			try {
				const created = await saved.create.mutateAsync({ ...input, name });
				setLinkParams((next) => next.set(SAVED_REPORT_PARAM, created.id));
				toast.success(t('dashboard.savedReports.SAVED', { name: created.name }));
				return true;
			} catch {
				toast.error(t('dashboard.savedReports.SAVE_FAILED'));
				return false;
			}
		},
		[saved.create, setLinkParams, t, view, weekStart]
	);

	const openReport = useCallback((target: ISavedReport) => openReportIn(setLinkParams, target), [setLinkParams]);

	const updateReport = useCallback(
		async (target: ISavedReport) => {
			const input = savedReportInputOf(view, weekStart, getDefaultTimezone());
			try {
				await saved.update.mutateAsync({ id: target.id, input });
				toast.success(t('dashboard.savedReports.UPDATED', { name: target.name }));
			} catch {
				toast.error(t('dashboard.savedReports.SAVE_FAILED'));
			}
		},
		[saved.update, t, view, weekStart]
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
		try {
			await saved.remove.mutateAsync(deleting.id);
			if (deleting.id === activeId) {
				setLinkParams((next) => next.delete(SAVED_REPORT_PARAM));
			}
			toast.success(t('dashboard.savedReports.DELETED', { name: deleting.name }));
			setDeleting(null);
		} catch {
			toast.error(t('dashboard.savedReports.DELETE_FAILED'));
		}
	}, [activeId, deleting, saved.remove, setLinkParams, t]);

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
	const isAnswered = saved.availability === 'ready' || saved.availability === 'error';
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
				onOpen={openReport}
				onUpdate={(target) => void updateReport(target)}
				onRename={setRenaming}
				onDelete={setDeleting}
				onRetry={() => void saved.retry()}
			/>
			<SaveButton onSave={saveView} isSaving={saved.create.isPending} />
			<ShareButton
				activeReport={activeReport}
				saved={saved}
				onSave={saveView}
				isSaving={saved.create.isPending}
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
