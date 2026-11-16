'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AppDialog, AppDialogHeader, APP_DIALOG_BODY, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/common/button';
import { EntityTile } from '@/core/components/common/entity-tile';
import { DateField } from '@/core/components/common/date-field';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { useWorkspaceWeekStart } from '@/core/hooks/common/use-workspace-week-start';
import type { InvoiceScheduleChange } from '@/core/hooks/invoices/use-invoice-schedules';
import { cn } from '@/core/lib/helpers';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { invoiceDayTextOf } from '@/core/lib/utils/invoices';
import {
	changedScheduleFieldsOf,
	defaultInvoiceScheduleInput,
	defaultStartDayOf,
	invoiceScheduleInputOf,
	isRealDayKey
} from '@/core/lib/utils/invoice-schedules';
import {
	INVOICE_SCHEDULE_FREQUENCIES,
	INVOICE_SCHEDULE_GROUPINGS,
	type InvoiceScheduleFrequency,
	type InvoiceScheduleGrouping,
	type InvoiceScheduleInput,
	type TInvoiceSchedule
} from '@/core/types/schemas/organization/invoice-schedule.schema';

const FIELD_LABEL = 'text-sm font-medium text-foreground';

type Delivery = 'draft' | 'send';

export interface InvoiceScheduleClient {
	id: string;
	name: string;
	imageUrl?: string | null;
	primaryEmail?: string | null;
}

interface InvoiceScheduleFormProps {
	client: InvoiceScheduleClient;
	/** The schedule to change; left out to set one. */
	schedule?: TInvoiceSchedule | null;
	todayKey: string;
	onCreate: (input: InvoiceScheduleInput) => Promise<unknown>;
	onUpdate: (change: InvoiceScheduleChange) => Promise<unknown>;
	onClose: () => void;
}

function Field({ label, htmlFor, children }: Readonly<{ label: string; htmlFor?: string; children: ReactNode }>) {
	if (htmlFor) {
		return (
			<div className="flex flex-col gap-1.5">
				<label htmlFor={htmlFor} className={FIELD_LABEL}>
					{label}
				</label>
				{children}
			</div>
		);
	}
	return (
		<fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
			<legend className={cn(FIELD_LABEL, 'mb-1.5')}>{label}</legend>
			{children}
		</fieldset>
	);
}

type SaveFailure = 'failed' | 'exists' | 'startAfterBilled';

/** The API's code for a new timeline that would bill again a period already billed. */
const START_AFTER_BILLED = 'INVOICE_SCHEDULE_START_AFTER_BILLED';

/**
 * Why a save failed: another tab set this client's schedule since the dialog opened (409), the new timeline starts
 * before the end of the last period billed, or anything else.
 */
function saveFailureOf(error: unknown): SaveFailure {
	if (!ApiErrorService.isApiError(error)) {
		return 'failed';
	}
	if (error.httpResponseStatus === 409) {
		return 'exists';
	}
	if (error.message?.includes(START_AFTER_BILLED)) {
		return 'startAfterBilled';
	}
	return 'failed';
}

function InvoiceScheduleForm({
	client,
	schedule,
	todayKey,
	onCreate,
	onUpdate,
	onClose
}: Readonly<InvoiceScheduleFormProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const fieldId = useId();
	const weekStart = useWorkspaceWeekStart();
	// The schedule as the dialog opened on it: a read that lands meanwhile (another tab set one) does not turn a new
	// schedule's form into a change of that one, which its person has not seen
	const [saved] = useState(() => (schedule ? invoiceScheduleInputOf(schedule) : null));
	const [input, setInput] = useState<InvoiceScheduleInput>(() => saved ?? defaultInvoiceScheduleInput(todayKey));
	const [isStartPicked, setIsStartPicked] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [failure, setFailure] = useState<SaveFailure | null>(null);
	const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

	const isStartValid = isRealDayKey(input.startDay);
	const showsStartError = hasTriedSubmit && !isStartValid;
	const clientEmail = client.primaryEmail?.trim() ?? '';
	const delivery: Delivery = input.sendInvoice ? 'send' : 'draft';

	const update = (patch: Partial<InvoiceScheduleInput>) => {
		setInput((current) => ({ ...current, ...patch }));
		setFailure(null);
	};

	// Until its person picks a day, a new schedule starts on the first day of this month, or of this week as the
	// workspace counts weeks: a weekly schedule then bills the weeks its reports show
	const pickFrequency = (frequency: InvoiceScheduleFrequency) => {
		if (saved || isStartPicked) {
			update({ frequency });
			return;
		}
		update({ frequency, startDay: defaultStartDayOf(frequency, todayKey, weekStart) });
	};

	const pickStartDay = (startDay: string) => {
		setIsStartPicked(true);
		update({ startDay });
	};

	const frequencyItems: SegmentedControlItem<InvoiceScheduleFrequency>[] = INVOICE_SCHEDULE_FREQUENCIES.map(
		(frequency) => ({ value: frequency, label: t(`invoices.schedule.frequency.${frequency}`) })
	);
	const groupingItems: SegmentedControlItem<InvoiceScheduleGrouping>[] = INVOICE_SCHEDULE_GROUPINGS.map(
		(grouping) => ({
			value: grouping,
			label: t(`invoices.schedule.grouping.${grouping}`)
		})
	);
	const deliveryItems: SegmentedControlItem<Delivery>[] = [
		{ value: 'draft', label: t('invoices.schedule.form.DRAFT') },
		{ value: 'send', label: t('invoices.schedule.form.SEND') }
	];

	const save = async () => {
		if (!saved) {
			await onCreate(input);
			return;
		}
		// Sent even when nothing changed: whoever saves a schedule takes it over, and its runs use their access from
		// then on, which is how a schedule whose last author can no longer make invoices bills again
		await onUpdate(changedScheduleFieldsOf(saved, input));
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setHasTriedSubmit(true);
		if (!isStartValid) {
			return;
		}
		setIsSaving(true);
		setFailure(null);
		try {
			await save();
			toast.success(t('invoices.schedule.toasts.SAVED', { name: client.name }));
			onClose();
		} catch (error) {
			setFailure(saveFailureOf(error));
		} finally {
			setIsSaving(false);
		}
	};

	const startId = `${fieldId}-start`;
	const startHintId = `${fieldId}-start-hint`;
	const deliveryHintId = `${fieldId}-delivery-hint`;
	let deliveryHint = t('invoices.schedule.form.DRAFT_HINT');
	if (input.sendInvoice) {
		deliveryHint = clientEmail
			? t('invoices.schedule.form.SEND_HINT', { email: clientEmail })
			: t('invoices.schedule.form.SEND_NO_EMAIL');
	}
	const title = saved ? t('invoices.schedule.form.EDIT_TITLE') : t('invoices.schedule.form.CREATE_TITLE');
	const lastBilledDay = schedule?.lastRun?.periodEnd ?? '';
	let failureText = t('invoices.schedule.form.SAVE_FAILED');
	if (failure === 'exists') {
		failureText = t('invoices.schedule.form.EXISTS');
	} else if (failure === 'startAfterBilled') {
		failureText = t('invoices.schedule.form.START_AFTER_BILLED', {
			day: invoiceDayTextOf(lastBilledDay, locale) ?? lastBilledDay
		});
	}

	return (
		<>
			<AppDialogHeader
				title={title}
				context={
					<>
						<EntityTile
							name={client.name}
							imageUrl={client.imageUrl}
							className="size-4 rounded-[5px] text-[7px]"
						/>
						<span className="truncate">{client.name}</span>
					</>
				}
				onClose={onClose}
			/>
			<form onSubmit={handleSubmit} noValidate className="contents">
				<fieldset disabled={isSaving} className={cn(APP_DIALOG_BODY, 'm-0 flex flex-col gap-5 border-0 pb-5')}>
					<Field label={t('invoices.schedule.form.FREQUENCY')}>
						<div className="-mx-5 -my-1 overflow-x-auto px-5 py-1 [scrollbar-width:none]">
							<SegmentedControl<InvoiceScheduleFrequency>
								items={frequencyItems}
								value={input.frequency}
								onValueChange={pickFrequency}
								ariaLabel={t('invoices.schedule.form.FREQUENCY')}
							/>
						</div>
					</Field>
					<Field label={t('invoices.schedule.form.START_DAY')} htmlFor={startId}>
						<DateField
							id={startId}
							value={input.startDay}
							aria-invalid={showsStartError || undefined}
							aria-describedby={startHintId}
							onChange={pickStartDay}
							className="max-w-48"
							inputClassName="h-9"
						/>
						{showsStartError && (
							<p role="alert" className="text-xs text-destructive-ink">
								{t('invoices.schedule.form.START_INVALID')}
							</p>
						)}
						<p id={startHintId} className="text-xs text-muted-foreground">
							{t('invoices.schedule.form.START_HINT')}
						</p>
					</Field>
					<Field label={t('invoices.schedule.form.GROUPING')}>
						<div>
							<SegmentedControl<InvoiceScheduleGrouping>
								items={groupingItems}
								value={input.grouping}
								onValueChange={(grouping) => update({ grouping })}
								ariaLabel={t('invoices.schedule.form.GROUPING')}
							/>
						</div>
					</Field>
					<Field label={t('invoices.schedule.form.DELIVERY')}>
						<div>
							<SegmentedControl<Delivery>
								items={deliveryItems}
								value={delivery}
								onValueChange={(picked) => update({ sendInvoice: picked === 'send' })}
								ariaLabel={t('invoices.schedule.form.DELIVERY')}
							/>
						</div>
						<p
							id={deliveryHintId}
							className={cn(
								'text-xs text-muted-foreground',
								input.sendInvoice && !clientEmail && 'text-warning-foreground'
							)}
						>
							{deliveryHint}
						</p>
					</Field>
				</fieldset>
				<div className={APP_DIALOG_FOOTER}>
					{failure && (
						<p role="alert" className="mr-auto text-xs text-destructive-ink">
							{failureText}
						</p>
					)}
					<Button
						type="button"
						variant="ghost"
						size="default"
						onClick={onClose}
						disabled={isSaving}
						className={cn(!failure && 'ml-auto')}
					>
						{t('common.CANCEL')}
					</Button>
					<Button type="submit" size="default" loading={isSaving} disabled={isSaving}>
						{t('invoices.schedule.form.SAVE')}
					</Button>
				</div>
			</form>
		</>
	);
}

interface InvoiceScheduleDialogProps extends InvoiceScheduleFormProps {
	open: boolean;
}

/** Sets or changes a client's billing schedule: how often, from which day, how its lines are grouped, draft or sent. */
export function InvoiceScheduleDialog({ open, onClose, ...form }: Readonly<InvoiceScheduleDialogProps>) {
	return (
		<AppDialog open={open} onClose={onClose} width="md" keepOpenOnOutsideClick>
			{open && <InvoiceScheduleForm {...form} onClose={onClose} />}
		</AppDialog>
	);
}
