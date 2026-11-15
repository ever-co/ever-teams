'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AppDialog, AppDialogHeader, APP_DIALOG_BODY, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/common/button';
import { EntityTile } from '@/core/components/common/entity-tile';
import { controlRecipe } from '@/core/components/common/input';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import type { InvoiceScheduleChange } from '@/core/hooks/invoices/use-invoice-schedules';
import { cn } from '@/core/lib/helpers';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import {
	changedScheduleFieldsOf,
	defaultInvoiceScheduleInput,
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

const DATE_FIELD = cn(controlRecipe, 'h-9 w-full max-w-48 px-2.5');

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

/** A 409 from the API: another tab set this client's schedule since the dialog opened. */
function isScheduleConflict(error: unknown) {
	return ApiErrorService.isApiError(error) && error.httpResponseStatus === 409;
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
	const fieldId = useId();
	const saved = schedule ? invoiceScheduleInputOf(schedule) : null;
	const [input, setInput] = useState<InvoiceScheduleInput>(() => saved ?? defaultInvoiceScheduleInput(todayKey));
	const [isSaving, setIsSaving] = useState(false);
	const [failure, setFailure] = useState<'failed' | 'exists' | null>(null);
	const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

	const isStartValid = isRealDayKey(input.startDay);
	const showsStartError = hasTriedSubmit && !isStartValid;
	const clientEmail = client.primaryEmail?.trim() ?? '';
	const delivery: Delivery = input.sendInvoice ? 'send' : 'draft';

	const update = (patch: Partial<InvoiceScheduleInput>) => {
		setInput((current) => ({ ...current, ...patch }));
		setFailure(null);
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
		const changes = changedScheduleFieldsOf(saved, input);
		if (Object.keys(changes).length > 0) {
			await onUpdate(changes);
		}
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
			setFailure(isScheduleConflict(error) ? 'exists' : 'failed');
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
								onValueChange={(frequency) => update({ frequency })}
								ariaLabel={t('invoices.schedule.form.FREQUENCY')}
							/>
						</div>
					</Field>
					<Field label={t('invoices.schedule.form.START_DAY')} htmlFor={startId}>
						<input
							id={startId}
							type="date"
							value={input.startDay}
							aria-invalid={showsStartError || undefined}
							aria-describedby={startHintId}
							onChange={(event) => update({ startDay: event.target.value })}
							className={DATE_FIELD}
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
							{failure === 'exists'
								? t('invoices.schedule.form.EXISTS')
								: t('invoices.schedule.form.SAVE_FAILED')}
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
