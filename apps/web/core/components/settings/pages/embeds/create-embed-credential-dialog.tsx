'use client';

import { FormEvent, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { APP_DIALOG_BODY, APP_DIALOG_FOOTER, AppDialog, AppDialogHeader } from '@/core/components/common/app-dialog';
import { Input } from '@/core/components/common/input';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import { ApiTokenSecret } from '@/core/components/settings/pages/api-tokens/api-token-secret';
import { useCreateEmbedCredential } from '@/core/hooks/settings/use-embeds';
import { cn } from '@/core/lib/helpers';
import {
	EMBED_CREDENTIAL_NAME_MAX_LENGTH,
	type CreatedEmbedCredential
} from '@/core/types/schemas/embeds/embed.schema';

type CreateFormProps = {
	create: ReturnType<typeof useCreateEmbedCredential>;
	onCancel: () => void;
	onCreated: (created: CreatedEmbedCredential) => void;
};

function CreateCredentialForm({ create, onCancel, onCreated }: Readonly<CreateFormProps>) {
	const t = useTranslations();
	const nameId = useId();
	const nameNoteId = useId();
	const [name, setName] = useState('');
	const [isNameMissing, setIsNameMissing] = useState(false);
	const isCreating = create.isPending;

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!name.trim()) {
			setIsNameMissing(true);
			return;
		}
		setIsNameMissing(false);
		create.mutate(name, { onSuccess: onCreated });
	};

	let nameNote = t('settings.embeds.NAME_HINT');
	if (isNameMissing) {
		nameNote = t('settings.embeds.NAME_REQUIRED');
	}
	let submitLabel = t('settings.embeds.CREATE');
	if (isCreating) {
		submitLabel = t('settings.embeds.CREATING');
	}

	return (
		<form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
			<AppDialogHeader title={t('settings.embeds.CREATE_TITLE')} onClose={onCancel} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-5 pt-1 pb-5')}>
				<div className="flex flex-col gap-1.5">
					<label htmlFor={nameId} className="text-xs font-medium text-foreground">
						{t('settings.embeds.NAME_LABEL')}
					</label>
					<Input
						id={nameId}
						value={name}
						onChange={(event) => setName(event.target.value)}
						maxLength={EMBED_CREDENTIAL_NAME_MAX_LENGTH}
						autoComplete="off"
						spellCheck={false}
						aria-invalid={isNameMissing}
						aria-describedby={nameNoteId}
						disabled={isCreating}
						data-initial-focus=""
					/>
					<p
						id={nameNoteId}
						className={cn('text-xs text-muted-foreground', isNameMissing && 'text-destructive-ink')}
					>
						{nameNote}
					</p>
				</div>
				{create.isError && <Notice tone="error" title={t('settings.embeds.CREATE_FAILED')} />}
			</div>
			<div className={cn(APP_DIALOG_FOOTER, 'justify-end')}>
				<Button type="button" variant="outline" onClick={onCancel} disabled={isCreating}>
					{t('common.CANCEL')}
				</Button>
				<Button type="submit" disabled={isCreating}>
					{isCreating && <Spinner className="animate-spin" aria-hidden="true" />}
					{submitLabel}
				</Button>
			</div>
		</form>
	);
}

/** The secret, shown this once, with where it belongs; Done (the only way out) forgets it. */
function CreatedCredentialStep({ created, onDone }: Readonly<{ created: CreatedEmbedCredential; onDone: () => void }>) {
	const t = useTranslations();
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<AppDialogHeader title={t('settings.embeds.SECRET_TITLE')} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-4 pt-1 pb-5')}>
				<p className="text-[13px] text-pretty text-muted-foreground">
					{t('settings.embeds.SECRET_TEXT', { name: created.name })}
				</p>
				<ApiTokenSecret value={created.secret} />
				<Notice tone="neutral" title={t('settings.embeds.SECRET_SERVER_ONLY')} />
			</div>
			<div className={cn(APP_DIALOG_FOOTER, 'justify-end')}>
				<Button type="button" onClick={onDone} data-initial-focus="">
					{t('settings.embeds.DONE')}
				</Button>
			</div>
		</div>
	);
}

/**
 * Creates a credential from a name, then shows its secret this once. While the secret is on screen only Done closes the
 * dialog, and while the credential is being made nothing does: the secret the server answers would be lost.
 */
export function CreateEmbedCredentialDialog({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
	const create = useCreateEmbedCredential();
	const [created, setCreated] = useState<CreatedEmbedCredential | null>(null);
	const isSecretShown = created !== null;
	const isCreating = create.isPending;

	const close = () => {
		if (isCreating) {
			return;
		}
		setCreated(null);
		create.reset();
		onClose();
	};

	return (
		<AppDialog
			open={open}
			onClose={close}
			width="sm"
			keepOpenOnOutsideClick
			dismissible={!isSecretShown && !isCreating}
		>
			{created && <CreatedCredentialStep created={created} onDone={close} />}
			{!created && <CreateCredentialForm create={create} onCancel={close} onCreated={setCreated} />}
		</AppDialog>
	);
}
