'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { AppDialog, AppDialogHeader, APP_DIALOG_BODY, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/common/button';
import { Input, controlRecipe } from '@/core/components/common/input';
import { useClientMutations } from '@/core/hooks/clients/use-client-mutations';
import { cn } from '@/core/lib/helpers';
import {
	CLIENT_NAME_MAX_LENGTH,
	CLIENT_NOTES_MAX_LENGTH,
	CLIENT_PHONE_MAX_LENGTH,
	draftFromClient,
	emptyClientDraft,
	hasClientDraftErrors,
	validateClientDraft,
	type ClientDraft,
	type ClientDraftError
} from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';

const ERROR_KEYS: Record<ClientDraftError, DottedLanguageObjectStringPaths> = {
	nameRequired: 'clients.form.NAME_REQUIRED',
	emailInvalid: 'clients.form.EMAIL_INVALID'
};

const FIELD_LABEL = 'text-sm font-medium text-foreground';

function initialDraftOf(client: TClient | null | undefined) {
	if (client) {
		return draftFromClient(client);
	}
	return emptyClientDraft();
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

interface ClientFormProps {
	/** The client to edit; left out to create one. */
	client?: TClient | null;
	onClose: () => void;
}

function ClientForm({ client, onClose }: Readonly<ClientFormProps>) {
	const t = useTranslations();
	const fieldId = useId();
	const { createClient, updateClient, isCreating, isUpdating } = useClientMutations();
	const [draft, setDraft] = useState<ClientDraft>(() => initialDraftOf(client));
	const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
	const [hasSaveFailed, setHasSaveFailed] = useState(false);
	// A save that ends after this form was closed must not close the form opened since, maybe for another client
	const isMountedRef = useRef(false);
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const isEdit = Boolean(client);
	const isSaving = isCreating || isUpdating;
	const validationErrors = validateClientDraft(draft);
	let nameError: ClientDraftError | undefined;
	let emailError: ClientDraftError | undefined;
	if (hasTriedSubmit) {
		nameError = validationErrors.name;
		emailError = validationErrors.primaryEmail;
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

	const save = async () => {
		if (client) {
			await updateClient({ client, draft });
			toast.success(t('clients.toasts.SAVED', { name: draft.name.trim() }));
			return;
		}
		await createClient(draft);
		toast.success(t('clients.toasts.CREATED', { name: draft.name.trim() }));
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
			if (isMountedRef.current) {
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

	return (
		<>
			<AppDialogHeader title={title} onClose={onClose} />
			<form onSubmit={handleSubmit} noValidate className="contents">
				<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-4 pb-5')}>
					<div className="flex flex-col gap-1.5">
						<label htmlFor={nameId} className={FIELD_LABEL}>
							{t('common.NAME')}
						</label>
						<Input
							id={nameId}
							data-initial-focus=""
							autoComplete="off"
							value={draft.name}
							maxLength={CLIENT_NAME_MAX_LENGTH}
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
								value={draft.primaryEmail}
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
								value={draft.primaryPhone}
								maxLength={CLIENT_PHONE_MAX_LENGTH}
								onChange={(event) => updateDraft({ primaryPhone: event.target.value })}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-1.5">
						<label htmlFor={notesId} className={FIELD_LABEL}>
							{t('common.NOTES')}
							<OptionalMark />
						</label>
						<textarea
							id={notesId}
							rows={3}
							value={draft.notes}
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

export function ClientFormDialog({ open, client, onClose }: Readonly<ClientFormDialogProps>) {
	return (
		<AppDialog open={open} onClose={onClose} width="md" keepOpenOnOutsideClick>
			{open && <ClientForm client={client} onClose={onClose} />}
		</AppDialog>
	);
}
