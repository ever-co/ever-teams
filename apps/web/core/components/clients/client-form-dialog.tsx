'use client';

import {
	cloneElement,
	useEffect,
	useId,
	useRef,
	useState,
	type FormEvent,
	type ReactElement,
	type ReactNode
} from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { AppDialog, AppDialogHeader, APP_DIALOG_BODY, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { Button } from '@/core/components/common/button';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Input, controlRecipe } from '@/core/components/common/input';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { Building } from '@/core/components/icons';
import { useClientMutations } from '@/core/hooks/clients/use-client-mutations';
import { cn } from '@/core/lib/helpers';
import {
	CLIENT_NAME_MAX_LENGTH,
	CLIENT_NOTES_MAX_LENGTH,
	CLIENT_PHONE_MAX_LENGTH,
	CLIENT_TERMS_MAX_DAYS,
	PAYMENT_TERMS_CHOICES,
	customTermsDaysOf,
	draftFromClient,
	draftWithPaymentTerms,
	emptyClientDraft,
	hasClientDraftErrors,
	paymentTermsInputOf,
	validateClientDraft,
	validatePaymentTerms,
	type ClientDraft,
	type ClientDraftError,
	type PaymentTermsChoice,
	type PaymentTermsInput
} from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';

export type ClientFormField = 'name' | 'primaryEmail' | 'primaryPhone' | 'paymentTerms' | 'notes';

const ERROR_KEYS: Record<ClientDraftError, DottedLanguageObjectStringPaths> = {
	nameRequired: 'clients.form.NAME_REQUIRED',
	emailInvalid: 'clients.form.EMAIL_INVALID',
	termsInvalid: 'clients.form.TERMS_INVALID'
};

const FIELD_LABEL = 'text-sm font-medium text-foreground';

const SECTION_LABEL = 'text-xs font-medium text-muted-foreground';

const FIXED_TERMS_LABELS: Partial<Record<PaymentTermsChoice, string>> = { '15': '15', '30': '30', '60': '60' };

function initialDraftOf(client: TClient | null | undefined) {
	if (client) {
		return draftFromClient(client);
	}
	return emptyClientDraft();
}

function initialFocusOf(field: ClientFormField, wanted: ClientFormField) {
	if (field !== wanted) {
		return undefined;
	}
	return '';
}

function FieldError({ id, error }: Readonly<{ id: string; error: ClientDraftError | undefined }>) {
	const t = useTranslations();
	if (!error) {
		return null;
	}
	return (
		<p id={id} role="alert" className="text-xs text-destructive-ink">
			{t(ERROR_KEYS[error])}
		</p>
	);
}

function OptionalMark() {
	const t = useTranslations();
	return <span className="font-normal text-muted-foreground"> ({t('clients.form.OPTIONAL')})</span>;
}

function FormSection({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
	return (
		<section className="flex flex-col gap-3">
			<h3 className={SECTION_LABEL}>{label}</h3>
			{children}
		</section>
	);
}

/** The words of a choice: the workspace's terms read shorter on a phone, so the six choices keep one row. */
function TermsChoiceLabel({ choice }: Readonly<{ choice: PaymentTermsChoice }>) {
	const t = useTranslations();
	const fixedLabel = FIXED_TERMS_LABELS[choice];
	if (fixedLabel) {
		return <>{fixedLabel}</>;
	}
	if (choice === 'receipt') {
		return <>{t('clients.terms.RECEIPT')}</>;
	}
	if (choice === 'custom') {
		return <>{t('clients.terms.CUSTOM')}</>;
	}
	return (
		<>
			<span className="max-sm:hidden">{t('clients.terms.WORKSPACE')}</span>
			<span className="sm:hidden">{t('clients.terms.WORKSPACE_SHORT')}</span>
		</>
	);
}

interface PaymentTermsFieldProps {
	terms: PaymentTermsInput;
	error: ClientDraftError | undefined;
	isLocked: boolean;
	hasInitialFocus: boolean;
	onChange: (terms: PaymentTermsInput) => void;
}

/**
 * The client's payment terms: the workspace's, on receipt, three common terms, or Custom, which opens a field for the
 * days in place. A new invoice of the client is due that many days after its issue.
 */
function PaymentTermsField({ terms, error, isLocked, hasInitialFocus, onChange }: Readonly<PaymentTermsFieldProps>) {
	const t = useTranslations();
	const fieldId = useId();
	const daysRef = useRef<HTMLInputElement>(null);
	const daysId = `${fieldId}-days`;
	const errorId = `${fieldId}-error`;
	const isCustom = terms.choice === 'custom';
	const customDays = customTermsDaysOf(terms.customDays);
	const unitCount = customDays ?? 0;

	const items: SegmentedControlItem<PaymentTermsChoice>[] = PAYMENT_TERMS_CHOICES.map((choice) => ({
		value: choice,
		label: <TermsChoiceLabel choice={choice} />
	}));

	const pickChoice = (choice: PaymentTermsChoice) => {
		onChange({ ...terms, choice });
		if (choice !== 'custom') {
			return;
		}
		// The days field mounts with this change: it takes the focus once it is on screen
		requestAnimationFrame(() => daysRef.current?.focus());
	};

	const typeDays = (customDaysText: string) => {
		onChange({ ...terms, customDays: customDaysText });
	};

	// A section's pencil opens the form on the terms: the picked choice takes the focus
	const markPickedChoice = (item: SegmentedControlItem<PaymentTermsChoice>, button: ReactElement) => {
		const isPicked = item.value === terms.choice;
		const takesFocus = isPicked && hasInitialFocus;
		if (!takesFocus) {
			return button;
		}
		return cloneElement(button as ReactElement<Record<string, unknown>>, { 'data-initial-focus': '' });
	};

	return (
		<fieldset disabled={isLocked} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
			<legend className={cn(FIELD_LABEL, 'mb-2')}>{t('clients.form.PAYMENT_TERMS')}</legend>
			<div className="-mx-5 -my-1 overflow-x-auto px-5 py-1 [scrollbar-width:none]">
				<SegmentedControl<PaymentTermsChoice>
					items={items}
					value={terms.choice}
					onValueChange={pickChoice}
					ariaLabel={t('clients.form.PAYMENT_TERMS')}
					renderItem={markPickedChoice}
				/>
			</div>
			<AnimatedHeight>
				{isCustom && (
					<div className="flex flex-col gap-1.5 pt-1">
						<div className="flex items-center gap-2">
							<Input
								ref={daysRef}
								id={daysId}
								inputMode="numeric"
								autoComplete="off"
								value={terms.customDays}
								maxLength={3}
								onChange={(event) => typeDays(event.target.value)}
								aria-label={t('clients.form.CUSTOM_DAYS_LABEL', { max: CLIENT_TERMS_MAX_DAYS })}
								aria-invalid={Boolean(error) || undefined}
								aria-describedby={errorId}
								className="w-20 tabular-nums"
							/>
							<span className="text-sm text-muted-foreground">
								{t('clients.form.DAYS_UNIT', { count: unitCount })}
							</span>
						</div>
						<FieldError id={errorId} error={error} />
					</div>
				)}
			</AnimatedHeight>
			<p className="text-xs text-muted-foreground">{t('clients.form.TERMS_HINT')}</p>
		</fieldset>
	);
}

interface ClientFormProps {
	/** The client to edit; left out to create one. */
	client?: TClient | null;
	focusField?: ClientFormField;
	onClose: () => void;
}

function DialogContext({ client }: Readonly<{ client: TClient | null | undefined }>) {
	const t = useTranslations();
	if (!client) {
		return (
			<>
				<Building aria-hidden="true" />
				<span className="truncate">{t('clients.TITLE')}</span>
			</>
		);
	}
	return (
		<>
			<EntityTile name={client.name} imageUrl={client.imageUrl} className="size-4 rounded-[5px] text-[7px]" />
			<span className="truncate">{client.name}</span>
		</>
	);
}

function ClientForm({ client, focusField = 'name', onClose }: Readonly<ClientFormProps>) {
	const t = useTranslations();
	const fieldId = useId();
	const { createClient, updateClient, isCreating, isUpdating } = useClientMutations();
	const [draft, setDraft] = useState<ClientDraft>(() => initialDraftOf(client));
	const [terms, setTerms] = useState<PaymentTermsInput>(() => paymentTermsInputOf(client?.paymentTermsDays));
	const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
	const [hasSaveFailed, setHasSaveFailed] = useState(false);
	// A save can end after its form was left: by then the page's dialog may hold another form.
	const isShownRef = useRef(false);

	useEffect(() => {
		isShownRef.current = true;
		return () => {
			isShownRef.current = false;
		};
	}, []);

	const isEdit = Boolean(client);
	const isSaving = isCreating || isUpdating;
	// The form closes on the client as it was sent: a change typed during the save would be lost with it.
	const isDraftLocked = isSaving;
	const draftErrors = validateClientDraft(draft);
	const termsErrors = validatePaymentTerms(terms);
	const validationErrors = { ...draftErrors, ...termsErrors };
	let nameError: ClientDraftError | undefined;
	let emailError: ClientDraftError | undefined;
	let termsError: ClientDraftError | undefined;
	if (hasTriedSubmit) {
		nameError = validationErrors.name;
		emailError = validationErrors.primaryEmail;
		termsError = validationErrors.paymentTermsDays;
	}

	let title = t('clients.form.CREATE_TITLE');
	let submitLabel = t('clients.form.CREATE');
	if (isEdit) {
		title = t('clients.form.EDIT_TITLE');
		submitLabel = t('common.SAVE_CHANGES');
	}

	const updateDraft = (patch: Partial<ClientDraft>) => {
		setDraft((current) => ({ ...current, ...patch }));
		setHasSaveFailed(false);
	};

	const updateTerms = (nextTerms: PaymentTermsInput) => {
		setTerms(nextTerms);
		setHasSaveFailed(false);
	};

	const save = async () => {
		const draftToSave = draftWithPaymentTerms(draft, terms);
		const savedName = draftToSave.name.trim();
		if (client) {
			await updateClient({ client, draft: draftToSave });
			toast.success(t('clients.toasts.SAVED', { name: savedName }));
			return;
		}
		await createClient(draftToSave);
		toast.success(t('clients.toasts.CREATED', { name: savedName }));
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setHasTriedSubmit(true);
		setHasSaveFailed(false);
		if (hasClientDraftErrors(validationErrors)) {
			return;
		}
		try {
			await save();
			if (isShownRef.current) {
				onClose();
			}
		} catch {
			setHasSaveFailed(true);
		}
	};

	const nameId = `${fieldId}-name`;
	const emailId = `${fieldId}-email`;
	const phoneId = `${fieldId}-phone`;
	const notesId = `${fieldId}-notes`;
	const nameErrorId = `${nameId}-error`;
	const emailErrorId = `${emailId}-error`;
	const focusesTerms = focusField === 'paymentTerms';

	return (
		<>
			<AppDialogHeader title={title} context={<DialogContext client={client} />} onClose={onClose} />
			<form onSubmit={handleSubmit} noValidate className="contents">
				<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-6 pb-5')}>
					<FormSection label={t('common.CONTACT')}>
						<div className="flex flex-col gap-1.5">
							<label htmlFor={nameId} className={FIELD_LABEL}>
								{t('common.NAME')}
							</label>
							<Input
								id={nameId}
								data-initial-focus={initialFocusOf('name', focusField)}
								autoComplete="off"
								value={draft.name}
								readOnly={isDraftLocked}
								maxLength={CLIENT_NAME_MAX_LENGTH}
								aria-required="true"
								placeholder={t('clients.form.NAME_PLACEHOLDER')}
								aria-invalid={Boolean(nameError) || undefined}
								aria-describedby={nameErrorId}
								onChange={(event) => updateDraft({ name: event.target.value })}
							/>
							<FieldError id={nameErrorId} error={nameError} />
						</div>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="flex flex-col gap-1.5">
								<label htmlFor={emailId} className={FIELD_LABEL}>
									{t('common.EMAIL')}
									<OptionalMark />
								</label>
								<Input
									id={emailId}
									type="email"
									inputMode="email"
									autoComplete="off"
									data-initial-focus={initialFocusOf('primaryEmail', focusField)}
									value={draft.primaryEmail}
									readOnly={isDraftLocked}
									placeholder={t('clients.form.EMAIL_PLACEHOLDER')}
									aria-invalid={Boolean(emailError) || undefined}
									aria-describedby={emailErrorId}
									onChange={(event) => updateDraft({ primaryEmail: event.target.value })}
								/>
								<FieldError id={emailErrorId} error={emailError} />
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor={phoneId} className={FIELD_LABEL}>
									{t('clients.form.PHONE')}
									<OptionalMark />
								</label>
								<Input
									id={phoneId}
									type="tel"
									inputMode="tel"
									autoComplete="off"
									data-initial-focus={initialFocusOf('primaryPhone', focusField)}
									value={draft.primaryPhone}
									readOnly={isDraftLocked}
									maxLength={CLIENT_PHONE_MAX_LENGTH}
									onChange={(event) => updateDraft({ primaryPhone: event.target.value })}
								/>
							</div>
						</div>
					</FormSection>
					<FormSection label={t('clients.form.BILLING')}>
						<PaymentTermsField
							terms={terms}
							error={termsError}
							isLocked={isDraftLocked}
							hasInitialFocus={focusesTerms}
							onChange={updateTerms}
						/>
					</FormSection>
					<div className="flex flex-col gap-1.5">
						<label htmlFor={notesId} className={FIELD_LABEL}>
							{t('common.NOTES')}
							<OptionalMark />
						</label>
						<textarea
							id={notesId}
							rows={3}
							data-initial-focus={initialFocusOf('notes', focusField)}
							value={draft.notes}
							readOnly={isDraftLocked}
							maxLength={CLIENT_NOTES_MAX_LENGTH}
							placeholder={t('clients.form.NOTES_PLACEHOLDER')}
							onChange={(event) => updateDraft({ notes: event.target.value })}
							className={cn(controlRecipe, 'min-h-20 resize-y px-2.5 py-2')}
						/>
					</div>
				</div>
				<div className={APP_DIALOG_FOOTER}>
					{hasSaveFailed && (
						<p role="alert" className="mr-auto text-xs text-destructive-ink">
							{t('clients.form.SAVE_FAILED')}
						</p>
					)}
					<Button
						type="button"
						variant="ghost"
						size="default"
						onClick={onClose}
						disabled={isSaving}
						className={cn(!hasSaveFailed && 'ml-auto')}
					>
						{t('common.CANCEL')}
					</Button>
					<Button type="submit" size="default" loading={isSaving} disabled={isSaving}>
						{submitLabel}
					</Button>
				</div>
			</form>
		</>
	);
}

interface ClientFormDialogProps extends ClientFormProps {
	open: boolean;
}

export function ClientFormDialog({ open, client, focusField, onClose }: Readonly<ClientFormDialogProps>) {
	return (
		<AppDialog open={open} onClose={onClose} width="md" keepOpenOnOutsideClick>
			{open && <ClientForm client={client} focusField={focusField} onClose={onClose} />}
		</AppDialog>
	);
}
