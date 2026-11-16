'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertDialogConfirmation } from '@/core/components/common/alert-dialog-confirmation';
import { Button } from '@/core/components/common/button';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { DASHBOARD_SURFACE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { InvoiceScheduleDialog, type InvoiceScheduleClient } from '@/core/components/invoices/invoice-schedule-dialog';
import {
	useClientInvoiceSchedule,
	useInvoiceScheduleMutations,
	useInvoiceScheduleRuns
} from '@/core/hooks/invoices/use-invoice-schedules';
import { cn } from '@/core/lib/helpers';
import { invoicePagePathOf } from '@/core/lib/utils/invoice-paths';
import { invoiceDayTextOf, invoicePeriodTextOf } from '@/core/lib/utils/invoices';
import {
	explainedReasonOf,
	invoiceScheduleRunToneOf,
	isPausedSchedule,
	leftOutHoursOf,
	OpenedScheduleGoneError,
	type InvoiceScheduleRunTone
} from '@/core/lib/utils/invoice-schedules';
import type { TInvoiceSchedule, TInvoiceScheduleRun } from '@/core/types/schemas/organization/invoice-schedule.schema';

const LABEL = 'text-xs font-medium text-muted-foreground';

/** How many runs the section lists: the history beyond them stays on the invoices they made. */
const RUNS_SHOWN = 3;

const TONE_TEXT: Record<InvoiceScheduleRunTone, string> = {
	success: 'text-success-foreground',
	neutral: 'text-muted-foreground',
	warning: 'text-warning-foreground',
	danger: 'text-destructive-ink',
	pending: 'text-info-foreground'
};

const TONE_DOT: Record<InvoiceScheduleRunTone, string> = {
	success: 'bg-success',
	neutral: 'bg-foreground/30',
	warning: 'bg-warning',
	danger: 'bg-destructive',
	pending: 'bg-info'
};

function periodTextOf(startDay: string, endDay: string, locale: string) {
	return invoicePeriodTextOf({ fromDay: startDay, toDay: endDay }, locale) ?? `${startDay} – ${endDay}`;
}

/** "Every month from 1 Oct 2026 · by project · kept as a draft" */
function ScheduleSummary({ schedule, clientEmail }: Readonly<{ schedule: TInvoiceSchedule; clientEmail: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const startText = invoiceDayTextOf(schedule.startDay, locale) ?? schedule.startDay;
	let delivery = t('invoices.schedule.DELIVERY_DRAFT');
	if (schedule.sendInvoice) {
		delivery = clientEmail
			? t('invoices.schedule.DELIVERY_SEND', { email: clientEmail })
			: t('invoices.schedule.DELIVERY_SEND_NO_EMAIL');
	}
	return (
		<div className="flex flex-col gap-0.5">
			<p className="text-[13px] font-medium text-foreground">
				{t('invoices.schedule.SUMMARY', {
					frequency: t(`invoices.schedule.frequency.${schedule.frequency}`),
					day: startText
				})}
			</p>
			<p className="text-xs text-muted-foreground">
				{t(`invoices.schedule.grouping.${schedule.grouping}`)} · {delivery}
			</p>
		</div>
	);
}

function NextInvoiceLine({ schedule }: Readonly<{ schedule: TInvoiceSchedule }>) {
	const t = useTranslations();
	const locale = useLocale();
	const next = schedule.nextPeriod;
	if (isPausedSchedule(schedule) || !next) {
		return <p className="text-xs text-muted-foreground">{t('invoices.schedule.NEXT_PAUSED')}</p>;
	}
	return (
		<p className="text-xs text-muted-foreground">
			{t('invoices.schedule.NEXT', {
				day: invoiceDayTextOf(next.runDay, locale) ?? next.runDay,
				period: periodTextOf(next.startDay, next.endDay, locale)
			})}
		</p>
	);
}

function RunLine({ run }: Readonly<{ run: TInvoiceScheduleRun }>) {
	const t = useTranslations();
	const locale = useLocale();
	const tone = invoiceScheduleRunToneOf(run.status);
	const reason = explainedReasonOf(run);
	const leftOutHours = leftOutHoursOf(run);
	const invoiceNumber = run.invoice?.invoiceNumber;
	return (
		<li className="flex flex-col gap-0.5 py-1.5">
			<div className="flex min-w-0 items-center gap-2">
				<span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', TONE_DOT[tone])} />
				<span className="min-w-0 truncate text-[13px] text-foreground">
					{periodTextOf(run.periodStart, run.periodEnd, locale)}
				</span>
				<span className={cn('ml-auto shrink-0 text-xs font-medium', TONE_TEXT[tone])}>
					{t(`invoices.schedule.run.${run.status}`)}
				</span>
			</div>
			{run.invoiceId && (
				<Link
					href={invoicePagePathOf(run.invoiceId)}
					className="ml-3.5 w-fit rounded-sm text-xs text-primary-ink outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					{typeof invoiceNumber === 'number'
						? t('invoices.NUMBER', { number: String(invoiceNumber) })
						: t('invoices.schedule.OPEN_INVOICE')}
				</Link>
			)}
			{reason && (
				<p className="ml-3.5 text-xs text-muted-foreground text-pretty">
					{t(`invoices.schedule.reason.${reason}`)}
				</p>
			)}
			{leftOutHours > 0 && (
				<p className="ml-3.5 text-xs text-warning-foreground text-pretty">
					{t('invoices.schedule.LEFT_OUT', { hours: leftOutHours })}
				</p>
			)}
		</li>
	);
}

function ScheduleRuns({ schedule }: Readonly<{ schedule: TInvoiceSchedule }>) {
	const t = useTranslations();
	const { runs, isLoading, isError, refetch } = useInvoiceScheduleRuns(schedule.id, { enabled: true });
	let body = <p className="py-1.5 text-xs text-muted-foreground">{t('invoices.schedule.NO_RUNS')}</p>;
	if (isLoading) {
		body = <div className={cn(SKELETON_BAR, 'my-2 h-3 w-40')} />;
	} else if (isError) {
		body = <DashboardErrorNotice title={t('invoices.schedule.RUNS_ERROR')} onRetry={() => void refetch()} />;
	} else if (runs.length > 0) {
		body = (
			<ul className="flex flex-col divide-y divide-border/60">
				{runs.slice(0, RUNS_SHOWN).map((run) => (
					<RunLine key={run.id} run={run} />
				))}
			</ul>
		);
	}
	return (
		<section className="flex flex-col gap-1">
			<h4 className={LABEL}>{t('invoices.schedule.RUNS')}</h4>
			{body}
		</section>
	);
}

interface ClientBillingScheduleSectionProps {
	client: InvoiceScheduleClient;
	todayKey: string;
	/** Whether the viewer may set and change the schedule: it makes invoices from everyone's time. */
	canManage: boolean;
}

/**
 * The client's billing schedule, in the rail of its page: how often its invoice is made by itself, the next one, and
 * the last runs with the invoices they made, or why they made none. A viewer who may make invoices sets, changes,
 * pauses, resumes and deletes it.
 */
export function ClientBillingScheduleSection({
	client,
	todayKey,
	canManage
}: Readonly<ClientBillingScheduleSectionProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const { schedule, workspace, isLoading, isError, isUnavailable, refetch } = useClientInvoiceSchedule(client.id, {
		enabled: true
	});
	const mutations = useInvoiceScheduleMutations(workspace);
	const [isFormOpen, setIsFormOpen] = useState(false);
	// The schedule the deletion was asked for, as the confirmation opened on it: a read that lands meanwhile (another
	// tab replaced it) never turns the confirmation into the deletion of a schedule its person has not seen
	const [deleteTarget, setDeleteTarget] = useState<TInvoiceSchedule | null>(null);
	const clientEmail = client.primaryEmail?.trim() ?? '';
	// The client's schedule as the latest read tells it: null when it has none, undefined while that read is on the
	// way or failed with nothing to show, which tells nothing (not a deletion)
	const latestSchedule = schedule ?? (isLoading || isError ? undefined : null);

	// An API without the billing schedules: the page shows no section rather than an error no retry can fix
	if (isUnavailable) {
		return null;
	}

	const togglePause = async (current: TInvoiceSchedule) => {
		const pauses = !isPausedSchedule(current);
		try {
			const saved = await mutations.updateSchedule({ scheduleId: current.id, change: { paused: pauses } });
			if (pauses) {
				toast.success(t('invoices.schedule.toasts.PAUSED', { name: client.name }));
				return;
			}
			const nextRunDay = saved.nextPeriod?.runDay ?? '';
			const nextDay = invoiceDayTextOf(nextRunDay, locale) ?? nextRunDay;
			toast.success(t('invoices.schedule.toasts.RESUMED', { name: client.name, day: nextDay }));
		} catch {
			toast.error(t('invoices.schedule.toasts.FAILED'));
		}
	};

	// Deletes the schedule the confirmation opened on, never one that replaced it since; one deleted meanwhile is
	// gone, as asked, and the toast says it already was
	const remove = async (target: TInvoiceSchedule) => {
		try {
			const deletion = await mutations.deleteOpenedSchedule({ scheduleId: target.id, latest: latestSchedule });
			setDeleteTarget(null);
			if (deletion === 'alreadyDeleted') {
				toast.info(t('invoices.schedule.toasts.ALREADY_DELETED', { name: client.name }));
				return;
			}
			toast.success(t('invoices.schedule.toasts.DELETED', { name: client.name }));
		} catch (error) {
			if (error instanceof OpenedScheduleGoneError) {
				setDeleteTarget(null);
				toast.error(t('invoices.schedule.toasts.REPLACED', { name: client.name }));
				return;
			}
			toast.error(t('invoices.schedule.toasts.FAILED'));
		}
	};

	let body = (
		<div className="flex flex-col gap-2">
			<div className={cn(SKELETON_BAR, 'h-3.5 w-44')} />
			<div className={cn(SKELETON_BAR, 'h-3 w-32')} />
		</div>
	);
	if (isError) {
		body = <DashboardErrorNotice title={t('invoices.schedule.ERROR')} onRetry={() => void refetch()} />;
	} else if (!isLoading && !schedule) {
		body = (
			<div className="flex flex-col items-start gap-2">
				<p className="text-xs text-muted-foreground text-pretty">{t('invoices.schedule.NONE_HINT')}</p>
				{canManage && (
					<Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(true)}>
						{t('invoices.schedule.SET_UP')}
					</Button>
				)}
			</div>
		);
	} else if (schedule) {
		const isPaused = isPausedSchedule(schedule);
		body = (
			<div className="flex flex-col gap-3">
				<div className="flex items-start gap-2">
					<ScheduleSummary schedule={schedule} clientEmail={clientEmail} />
					<span
						className={cn(
							'ml-auto shrink-0 rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium',
							isPaused ? 'bg-foreground/5 text-muted-foreground' : 'bg-success/10 text-success-foreground'
						)}
					>
						{isPaused ? t('invoices.schedule.PAUSED') : t('invoices.schedule.ACTIVE')}
					</span>
				</div>
				<NextInvoiceLine schedule={schedule} />
				<ScheduleRuns schedule={schedule} />
				{canManage && (
					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(true)}>
							{t('invoices.schedule.EDIT')}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							loading={mutations.isSaving}
							disabled={mutations.isSaving}
							onClick={() => void togglePause(schedule)}
						>
							{isPaused ? t('invoices.schedule.RESUME') : t('invoices.schedule.PAUSE')}
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-destructive-ink"
							onClick={() => setDeleteTarget(schedule)}
						>
							{t('common.DELETE')}
						</Button>
					</div>
				)}
			</div>
		);
	}

	return (
		<section className={cn(DASHBOARD_SURFACE, 'flex flex-col gap-3 p-4')} aria-label={t('invoices.schedule.TITLE')}>
			<h3 className="text-[13px] font-semibold text-foreground">{t('invoices.schedule.TITLE')}</h3>
			{body}
			{canManage && (
				<InvoiceScheduleDialog
					open={isFormOpen}
					client={client}
					schedule={schedule}
					todayKey={todayKey}
					onCreate={(input) => mutations.createSchedule({ clientId: client.id, input })}
					// The schedule the form opened on, checked against the latest read: a change is never saved to a
					// schedule that replaced it since, and a save with no schedule left fails instead of passing. A
					// read still on the way, or failed with nothing to show, tells nothing (undefined), not a deletion
					onUpdate={(scheduleId, change) =>
						mutations.updateOpenedSchedule({ scheduleId, latest: latestSchedule, change })
					}
					onClose={() => setIsFormOpen(false)}
				/>
			)}
			{canManage && (
				<AlertDialogConfirmation
					isOpen={deleteTarget !== null}
					onOpenChange={(isOpen) => {
						if (!isOpen) {
							setDeleteTarget(null);
						}
					}}
					title={t('invoices.schedule.delete.TITLE')}
					description={t('invoices.schedule.delete.BODY', { name: client.name })}
					confirmText={t('common.DELETE')}
					loading={mutations.isDeleting}
					onConfirm={() => {
						if (deleteTarget) {
							void remove(deleteTarget);
						}
					}}
					onCancel={() => setDeleteTarget(null)}
				/>
			)}
		</section>
	);
}
